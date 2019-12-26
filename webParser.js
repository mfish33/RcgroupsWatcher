module.exports = (rawHTML) => {
    let listings = rawHTML.match(/thread_title_(\n|.)+<\/a>/g)
    .map(listing => {
        return {
            id : listing.match(/_\d+">/)[0].replace(/[_">]/g,''), 
            data : listing.match(/>.+</)[0].replace(/[<>]/g,'')
    }})
    return listings
}
