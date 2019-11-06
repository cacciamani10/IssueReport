const issues = [];
let display_name;
fetch('/user')
    .then(userRes => {
        if (userRes.status != 200) {
            console.log(userRes.status);
            return;
        }
        userRes.json()
    .then(userData => {
        let userOptions = document.getElementById('navbarDropdown');
        display_name = userData.display_name; 
        userOptions.innerHTML = display_name;
        return fetch('/getIssues/resolved');
    })
    .then(res => {
        if (res.status !== 200) {
            console.log(res.status);
            return;
        }
        res.json().then(data => {
            let tickets = document.getElementById('issues');
            if (data.length === 0) {
                tickets.innerHTML = `
                <div class="jumbotron jumbotron-fluid">
                    <h1 class="display-4">No Tickets</h1>
                    <hr class="my-4">
                    <p>Click <a href="/create" role="button">here</a> to create one.</p>
                </div>`
            }
            else {
                tickets.innerHTML = '';
                for (let item of data) {
                    if (item.created_by === display_name) {
                        item.created_by = 'You';
                    }
                    issues.push(item);
                    tickets.innerHTML += issueToString(item);
                }
            }
        });
    })
    }).catch(err => console.log(err));

function filterItems() {
    let found;
    const regex = new RegExp(document.getElementById('search-bar').value, 'i');
    let tickets = document.getElementById('issues');
    tickets.innerHTML = '';
    for (let item of issues) {
        found = false;
        const iterItem = Object.values(item);
        for (let value of iterItem) {
            if (regex.test(value)) {
                found = true;
                break;
            }
        }
        if(found) {
            tickets.innerHTML += issueToString(item);
        }
    }
}

function issueToString(item) {
    return `<div class="card" style="margin: 30px 12px;">
        <div class="card-header" style="font-weight: 500;">
            Ticket: #${item.ticket_id}
            <span class="badge float-right badge-success">Resolved</span>
        </div>
        <div class="card-body">
            <h5 class="card-title">${item.ticket_subject}</h5>
            <h6 class="card-subtitle mb-2 text-muted">Created by: ${item.created_by}</h6>
            <p class="card-text">${item.ticket_description}</p>
            <div class="card-footer text-muted">
            Resolved by: ${item.resolved_by} on ${item.resolved_on}
            ${(item.resolved_notes == '' ? '' : `<hr> Notes: ${item.resolved_notes}`)} 
            </div>
        </div>
    </div>`;
}