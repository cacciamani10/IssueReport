//const url = window.location.hostname;
fetch('/getIssues')
    .then(res => {
        if (res.status !== 200) {
            console.log(res.status);
            return;
        }
        console.log(data);
    })
    .catch(err => {
        console.log(err);
    });