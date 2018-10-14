'use strict'

class ProcessPool {
  constructor (workers) {
    this.id = 0
    this.pending = {}
    this.workers = workers.map(instance => {
      return {
        instance: instance,
        load: 0
      }
    })
    this.workers.forEach(worker => {
      worker.instance.on('message', (msg) => {
        worker.load--
        if (typeof msg !== 'undefined' && typeof msg.id === 'number') {
          const pending = this.pending[msg.id];
          if (typeof pending !== 'undefined') {
            if (typeof pending.error !== 'undefined') {
              pending.reject(msg.error)
            } else {
              pending.resolve(msg.data)
            }
            delete this.pending[msg.id]
          } else {
            console.log("received an old message that has expired.. doing nothing")
          }
        }
      })
    })
  }

  call (api, func, data) {
    return new Promise((resolve, reject) => {
      const id = this.id++

      this.pending[id] = {
        resolve: resolve,
        reject: reject
      }

      if (this.workers.length == 0) {
        reject(new Error("no worker available"))
        return
      }

      // send a job to the worker with the least load (number of pending items)
      const worker = this.workers.sort((a, b) => a.load - b.load)[0]

      worker.load++
      worker.instance.send({
        id: id,
        api: api,
        func: func,
        data: data
      })
    })
  }
}

module.exports = ProcessPool
module.exports.default = ProcessPool
module.exports.ProcessPool = ProcessPool
