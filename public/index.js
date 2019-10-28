//const url = window.location.hostname;
fetch('/getIssues')
    .then(res => {
        if (res.status !== 200) {
            console.log(res.status);
            return;
        }
        res.json().then(data => {
            let tickets = document.getElementById('issues');
            tickets.innerHTML = '';
            for (let item of data) {
                tickets.innerHTML += 
                `<div class="card">
                    <div class="card-header">
                        ${item.ticket_id}
                    </div>
                    <div class="card-body" style="margin: 40px;">
                        <h5 class="card-title">${item.ticket_subject}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${item.created_by}</h6>
                        <p class="card-text">${item.ticket_description}</p>
                        <a href="#" class="card-link">Card link</a>
                        <a href="#" class="card-link">Another link</a>
                    </div>
                </div> <br>`
            }
        });
    })
    .catch(err => {
        console.log(err);
    });