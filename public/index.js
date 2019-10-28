//const url = window.location.hostname;
fetch('/getIssues')
    .then(res => {
        if (res.status !== 200) {
            console.log(res.status);
            return;
        }
        res.json().then(data => {
            console.log(data);
        });
    })
    .catch(err => {
        console.log(err);
    });