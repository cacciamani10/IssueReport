const url = window.location.hostname;
fetch('url' + '/getIssues')
    .then(res => {
        res.json()
    })
    .then(data => {
        console.log(data);
    })
    .catch(err => {
        console.log(err);
    })