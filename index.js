'use strict';

class ProcessPool {
  constructor(workers) {
    this.id = 0;
    this.pending = {};
    // console.log("workers:", workers)
    this.workers = workers.map(instance => {
      return {
        instance: instance,
        load: 0
      }
    })
    // console.log("this.workers:", this.workers)
    this.workers.forEach(worker => {
      worker.instance.on('message', (msg) => {
        worker.load--;
        // console.log("received data from childProcess:", msg);
        if (typeof msg !== 'undefined' && typeof msg.id === 'number') {
          const pending = this.pending[msg.id];
          if (typeof pending !== 'undefined') {
            if (typeof pending.error !== 'undefined') {
              //console.log("rejecting", msg.error)
              pending.reject(msg.error)
            } else {
              //console.log("resolving", msg.data)
              pending.resolve(msg.data)
            }
            //console.log("cleaning after ourselves")
            delete this.pending[msg.id];
          } else {
            console.log("received an old message that has expired.. doing nothing")
          }
        }
      })
    })
  }

  call(api, func, data) {
    /*
    console.log("calling.. api: ", api);
    console.log("calling.. func: ", func);
    console.log("calling.. data: ", data);
    */
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.pending[id] = {
        resolve: resolve,
        reject: reject
      }

      if (this.workers.length == 0) {
        console.log("no worker available");
        reject(new Error("no worker available"))
        return;
      }

      // send a job to the worker with the least load (number of pending items)
      const worker = this.workers.sort((a, b) => a.load - b.load)[0];

      worker.load++;
      /*
      console.log("send.. id: ", id);
      console.log("send.. api: ", api);
      console.log("send.. func: ", func);
      console.log("send.. data: ", data);
      */
      worker.instance.send({
        id: id,
        api: api,
        func: func,
        data: data
      });

    });
  }
}

module.exports = ProcessPool;
module.exports.default = ProcessPool;
module.exports.ProcessPool = ProcessPool;
