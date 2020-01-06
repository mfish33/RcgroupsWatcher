//modules imports
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');
const DomParser = require('dom-parser');
let parser = new DomParser();

//import custom array class to lower storage and memory as time goes on
const circularArray = require('./circularArray.js');

//get bot token from .env file
require('dotenv').config();

// express app setup
const app = express();
app.use(bodyParser.json());
const port = 8080;

//Set to desired rc groups classified link
let URL = 'https://www.rcgroups.com/aircraft-electric-multirotor-fs-w-733/';

let usedIDs = []; //set global scope for varible to use inside iffie init func
//init
(async () => {
	await storage.init();
	usedIDs = new circularArray(100, storage, await storage.getItem('ids'));
	app.listen(port, () => console.log(`app started on port: ${port}!`));
})();

//slack bot endpoint
app.post('/handleSlack', async (req, res) => {
	res.sendStatus(200); //send res imeadiatly becasue the bot will respond through sending messages into slack
	try {
		//prevent app crash if somthing goes wrong at runtime
		let { text, user, channel } = req.body.event;
		let [ , command, ...keywords ] = text.split(' ');
		keywords = keywords.join(' ').split(',').map((keyword) => keyword.toLowerCase());
		let storedKeywords = await storage.getItem('keywords');

		if (command == 'add') {
			if (!storedKeywords) {
				storedKeywords = [];
			}
			for (let keyword of keywords) {
				let storedKeyword = storedKeywords.filter((i) => i.keyword == keyword)[0];
				if (storedKeyword) {
					let updatedKeywords = storedKeywords.map((i) => {
						if (i.keyword == keyword && !i.users.includes(user)) {
							i.users.push(user);
						}
						return i;
					});
					storage.setItem('keywords', updatedKeywords);
				} else {
					storedKeywords.push({
						keyword: keyword,
						users: [ user ]
					});
					storage.setItem('keywords', storedKeywords);
				}
			}
		} else if (command == 'remove') {
			let updatedKeywords = storedKeywords.map((i) => {
				if (keywords.includes(i.keyword)) {
					i.users = i.users.filter((j) => j != user);
				}
				return i;
			});
			storage.setItem('keywords', updatedKeywords);
		} else if (command == 'keywords') {
			let subscribedKeywords = storedKeywords.filter((i) => i.users.includes(user));
			let formatedOutput = subscribedKeywords.reduce((acc, i) => `${acc},${i.keyword}`, '').substr(1);
			if (formatedOutput) {
				sendMessage(channel, `you are subscribed to the following keywords: ${formatedOutput}`);
			} else {
				sendMessage(channel, 'You are not subscribed to any keywords');
			}
		} else {
			sendMessage(channel, 'The RCG bot did not understand your request');
		}
	} catch (e) {
		console.log(e);
	}
});

/**
*retrieves data from rcgroups and sends apropriate messages 
*/
const updateStore = async () => {
	try { //stops app from crashing if there is an error with the fetch
		let data = RCGparser(await fetch(URL).then((res) => res.text()));
		let storedKeywords = await storage.getItem('keywords');
		for (let item of data) {
			if (!usedIDs.arr.includes(item.id)) {
				usedIDs.write(item.id);
				for (let keyword of storedKeywords) {
					let searchRegex = new RegExp(keyword.keyword);
					if (item.title.match(searchRegex) || item.details.match(searchRegex)) {
						for (let user of keyword.users) {
							sendMessage(user,`your watch for ${keyword.keyword} triggered when ${item.title} was been posted to RCG ${item.url}`);
						}
					}
				}
			}
		}
	} catch (e) {
		console.log(e);
	}
};

/**
*parses data retrieved from rcgroups fetch and returns it as an array of objects
*@param {string} rawHTML HTML file as a string
*/
const RCGparser = (rawHTML) => {
	var dom = parser.parseFromString(rawHTML);
	return dom.getElementsByClassName('fsw-title').map((el) => {
		return {
			title: el.firstChild.innerHTML.toLowerCase(),
			details: el.firstChild.outerHTML.match(/(?<=data-tip=")((.|\n)*?)(?=")/)[0].toLowerCase(),
			url: `https://www.rcgroups.com/forums/${el.firstChild.outerHTML.match(/(?<=href=")((.|\n)*?)(?=")/)[0]}`,
			id: el.firstChild.outerHTML.match(/(?<="thread_title_)((.|\n)*?)(?=")/)[0]
		};
	});
};

/**
*sends message to slack workspace asynchronously
*@param {string} userOrChannel desied user of channel of message
*@param {string} text message to show up in slack
*/
const sendMessage = (userOrChannel, text) => {
	const body = {
		channel: userOrChannel,
		text: text
	};

	fetch('https://slack.com/api/chat.postMessage', {
		method: 'post',
		body: JSON.stringify(body),
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${process.env.BOT_KEY}`
		}
	});
};

// start retrieving data
setInterval(updateStore, 60000);