module.exports = class CircularArray {
	constructor(size) {
    this.size = size
		this.arr = []
		this.writeHead = 0;
	}

	write(val) {
		this.arr.push(val)
		if(this.arr.length > this.size) {
      this.arr.shift()
    }
	}
};
