const issues = [];
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
                issues.push(item);
                tickets.innerHTML += 
                `<div class="card" style="margin: 12px;">
                    <div class="card-header">
                        Ticket ID: ${item.ticket_id}
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${item.ticket_subject}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">Created by: ${item.created_by}</h6>
                        <p class="card-text">${item.ticket_description}</p>
                        <a href="#" class="card-link">Card link</a>
                        <a href="#" class="card-link">Another link</a>
                    </div>
                </div>`
            }
        });
    })
    .catch(err => {
        console.log(err);
    });

function filterItems() {
    let found;
    const regex = new RegExp(document.getElementById('search-bar').value, 'i');
    let tickets = document.getElementById('issues');
    tickets.innerHTML = '';
    for (let item of issues) {
        found = false;
        for (let [key, value] of Object.entries(item)) {
            if (regex.test(value)) {
                found = true;
                break;
            }
        }
        if(found) {
            tickets.innerHTML += 
            `<div class="card" style="margin: 12px;">
                <div class="card-header">
                    Ticket ID: ${item.ticket_id}
                </div>
                <div class="card-body">
                    <h5 class="card-title">${item.ticket_subject}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${item.created_by}</h6>
                    <p class="card-text">${item.ticket_description}</p>
                    <a href="#" class="card-link">Card link</a>
                    <a href="#" class="card-link">Another link</a>
                </div>
            </div>`
        }
    }
}