//const url = window.location.hostname;
fetch('/getIssues')
    .then(res => {
        if (res.status !== 200) {
            console.log(res.status);
            return;
        }
        res.json().then(data => {
            for (let item of data) {
                console.log(item);
            }
        });
    })
    .catch(err => {
        console.log(err);
    });