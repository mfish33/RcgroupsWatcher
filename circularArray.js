module.exports = class CircularArray {
	constructor(size,storage,arr) {
		this.size = size;
		this.arr = arr ? arr : [];
		this.writeHead = 0;
		this.storage = storage
	}

	write(val) {
		this.arr.push(val);
		if (this.arr.length > this.size) {
			this.arr.shift();
		}
		this.storage.setItem('ids',this.arr)
	}
};
