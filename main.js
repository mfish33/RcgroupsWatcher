const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');
const DomParser = require('dom-parser');
let parser = new DomParser();

//storage setup
(async() => {await storage.init()})();


let URL = 'https://www.rcgroups.com/aircraft-electric-multirotor-fs-w-733/';
let botToken = 'Token';

const app = express();
app.use(bodyParser.json());
const port = 8080;

let usedIDs = []
let idHistorySize = 30;

app.post('/handleSlack', async (req, res) => {
    try{
        let {event} = req.body
        let {text,user} = event
        let [,command,...keyWords] = text.split(' ')
        keyWords = keyWords.join(' ').split(',').map(keyword => keyword.toLowerCase())

        if(command == 'add') {
            for(let keyWord of keyWords) {
                let watchers = await storage.getItem(keyWord)
                if(watchers) {
                    watchers.includes(user) ? null : watchers.push(user)
                    storage.setItem(keyWord,watchers)
                } else {
                    storage.setItem(keyWord,[user])
                }
            }

        } else if(command == 'remove') {
            for(let keyWord of keyWords) {
                let watchers = await storage.getItem(keyWord)
                if(watchers) {
                    storage.setItem(keyWord,watchers.filter(watcher => watcher!=user))
                }
            }
        } else {
            sendMessage(user,'The RCG bot did not understand your request')
        }
        
    } catch (e) {
        console.log(e)
    }
	res.sendStatus(200);
});

app.get('/', (req, res) => {
	res.send('hello');
});

app.listen(port, () => console.log(`app started on port: ${port}!`));

async function updateStore() {
	let data = RCGparser(await fetch(URL).then((res) => res.text()));
    console.log('data recieved');
    let search = await storage.keys()
	for (let item of data) {
		if (!usedIDs.includes(item.id)) {
            usedIDs.push(item.id); 

            //make sure ID list does not get too big
            if(usedIDs.length > idHistorySize) {
                usedIDs.shift()
            }

            for(let term of search) {
                let searchRegex = new RegExp(term)
                if(item.title.match(searchRegex) || item.details.match(searchRegex)) {
                    let users = await storage.getItem(term)
                    for(let user of users) {
                        sendMessage(user,`your watch for ${term} triggered when ${item.title} was been posted to RCG ${item.url}`)
                    }
                }
            }
		}
    }
    console.log(usedIDs.arr)
}

const RCGparser = (rawHTML) => {
    var dom = parser.parseFromString(rawHTML);
    return dom.getElementsByClassName('fsw-title').map(el => {
        return {
            title: el.firstChild.innerHTML.toLowerCase(),
            details: el.firstChild.outerHTML.match(/(?<=data-tip=")((.|\n)*?)(?=")/)[0].toLowerCase(),
            url:`https://www.rcgroups.com/forums/${el.firstChild.outerHTML.match(/(?<=href=")((.|\n)*?)(?=")/)[0]}`,
            id:el.firstChild.outerHTML.match(/(?<="thread_title_)((.|\n)*?)(?=")/)[0]
        }
    })
};

const sendMessage = (user,text) => {

    const body = {
        channel:user,
        text:text
    };
 
    fetch('https://slack.com/api/chat.postMessage', {
            method: 'post',
            body:    JSON.stringify(body),
            headers: { 
                'Content-Type': 'application/json',
                'Authorization' : `Bearer ${botToken}`
            },
        })
}

updateStore();
setInterval(updateStore,60000)
