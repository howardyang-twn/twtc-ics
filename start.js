const moment = require('moment');
const rp = require('request-promise');
const parser = require('fast-xml-parser');
const express = require('express');
const ics = require('ics');
const port = 80;
const app = express();

app.get('/', async (req, res) => {
    try {
        let {error, value} = await transform();
        if (! error) {
            res.end(value);
        }
    } catch(e) {}

    res.end(500);
});

app.listen(port, () => console.log(`Ticker service start on port ${port}!`));

const transform = async () => {
    let xmlData = await rp('https://app.twtc.org.tw/TTSAppAdmin/gipservice/webapp/recentExhibitionLP.do', {json:true});

    if( parser.validate(xmlData) !== true) { //optional (it'll return an object in case it's not valid)
        return undefined;
    }

    let xml = parser.parse(xmlData, {
        attributeNamePrefix : "",
        attrNodeName: "attr",
        ignoreAttributes : false,
    });

    let { Events: {dataList: {Articles: {Article}}} } = xml;
    let events = [];

    Article
    .filter(a => ['nangang1', 'nangang2'].includes(a.attr.catCode))
    .map(a => {
        let {title, location, date} = a;
        let [start, end] = date.split('～')
        .map(d => d.substr(0, 10).replace(/\//g,'-'))
        .map(d => moment(d).format('YYYY-M-D-9-0').split("-"));

        events.push({start, end, title, location, alarms: [{
            action: 'audio', 
            trigger: {days:1, before: true}, 
            attachType:'VALUE=URI', 
            attach: 'Glass'
        }]});
    });

    return ics.createEvents(events);
};
