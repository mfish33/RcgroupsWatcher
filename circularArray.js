module.exports = class CircularArray {
    constructor(size) {
      this.arr = (new Array(size))
      this.writeHead = 0
    }

    write(val) {
        this.arr[this.writeHead] = val
        this.writeHead = (this.writeHead+1) % this.arr.length
    }
  
  }
  