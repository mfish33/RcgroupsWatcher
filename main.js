const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');

let URL = 'https://www.rcgroups.com/aircraft-electric-multirotor-fs-w-733/';
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))
const port = 3000;

let usedIDs = new Set();

app.post('/handleSlack', (req, res) => {
	console.log(req.body);
	res.send(req.body.challenge);
});

app.get('/', (req, res) => {
	res.send('hello');
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

async function updateStore() {
	let data = parser(await fetch(URL).then((res) => res.text()));
	console.log('data recieved');
	for (let item of data) {
		if (!usedIDs.has(item.id)) {
			usedIDs.add(item.id);
		}
	}
}

const parser = (rawHTML) => {
	let listings = rawHTML.match(/thread_title_(\n|.)+<\/a>/g).map((listing) => {
		return {
			id: listing.match(/_\d+">/)[0].replace(/[_">]/g, ''),
			data: listing.match(/>.+</)[0].replace(/[<>]/g, '')
		};
	});
	return listings;
};

updateStore();
setTimeout(updateStore, 2000);
//setInterval(updateStore,60000)
