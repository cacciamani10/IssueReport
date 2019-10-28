//const url = window.location.hostname;
fetch('/getIssues')
    .then(res => {
        res.json()
        .then(data => {
            console.log(data);
        })
    })
    .catch(err => {
        console.log(err);
    })