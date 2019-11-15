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
        return fetch('/getIssues/user');
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
                    <h1 class="display-4">You haven't submitted any tickets.</h1>
                    <hr class="my-4">
                    <p>Click <a href="/create" role="button">here</a> to create one.</p>
                </div>`
            }
            else {
                tickets.innerHTML = '';
                for (let item of data) {
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
    let res = '';
    res += 
    `<div class="card border-primary shadow" style="margin: 30px 12px;">
        <div class="card-header" style="font-weight: 500;">
            Ticket: #${item.ticket_id}
            <span class="badge float-right badge-${item.resolved ? 'success">Resolved' : 'warning">Unresolved'}</span>
        </div>
        <div class="card-body">
            <h5 class="card-title">${item.ticket_subject}</h5>
            <h6 class="card-subtitle mb-2 text-muted">Created by: You</h6>
            <p class="card-text">${item.ticket_description}</p>`;
    if (!item.resolved) {
        res +=
            `
            <button type="button" class="btn btn-success" onclick="makeEditable(this)">
                Edit
            </button>
            <button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                Resolve
            </button>
            <div class="dropdown-menu" style="margin-left: ($spacer * .25); min-width: 80%;">
                <form action="/resolve" class="px-4 py-3" method="post">
                    <input type="hidden" name="ticket_id" value="${item.ticket_id}">
                    <div class="form-group">
                        <label for="resolved_notes">Notes</label>
                        <textarea class="form-control" name="resolved_notes" id="resolved_notes" placeholder="Notes"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Mark as Resolved</button>
                </form>
            </div>
        </div>
    </div>`;
    }
    else {
        res +=
            `<hr><div class="card-text">
                Resolved by: ${(item.resolved_by === display_name ? 'You' : item.resolved_by)} on ${dateString(item.resolved_on)}
                ${(item.resolved_notes == '' ? '' : `<hr> Notes: ${item.resolved_notes}`)} 
            </div>
        </div>
    </div>`
    }
    return res;
}

const dateString = (date) => {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString() + ' at ' + dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function makeEditable(card) {
    // Get ticket ID
    let wholeCard = card.parentElement.parentElement;
    let header = wholeCard.querySelector('div.card-header')
    let indexOfTicketID = header.innerText.indexOf('#') + 1;
    let ticket_id = header.innerText.substring(indexOfTicketID, header.innerText.indexOf('\n'));
    let ticketToRender;

    // Locate in array
    issues.forEach(ele => {
        if (ele.ticket_id == ticket_id) {
            ticketToRender = ele;
            return;
        }
    });
    if (ticketToRender == null) { return; }

    // Render new editable card
    wholeCard.innerHTML = 
    `<div class="card border-primary shadow" style="margin: 30px 12px;">
        <div class="card-header" style="font-weight: 500;">
            Ticket: #${ticketToRender.ticket_id}
            <span class="badge float-right badge-${ticketToRender.resolved ? 'success">Resolved' : 'warning">Unresolved'}</span>
        </div>
        <div class="card-body">
            <form action="/edit">
            <input type="text" class="card-title form-control" value="${ticketToRender.ticket_subject}">
            <h6 class="card-subtitle mb-2 text-muted">Created by: You</h6>
            <input type="text" class="card-text form-control" value="${ticketToRender.ticket_description}">
            <button type="submit" class="btn btn-primary">Finish</button>
            <button type="button" class="btn btn-danger" onclick="cancelEdit(this)">
                Cancel
            </button>
        </div>
    </div>`;
}

function cancelEdit(card) {
    // Get ticket ID
    let wholeCard = card.parentElement.parentElement;
    let header = wholeCard.querySelector('div.card-header')
    let indexOfTicketID = header.innerText.indexOf('#') + 1;
    let ticket_id = header.innerText.substring(indexOfTicketID, header.innerText.indexOf('\n'));
    let ticketToRender;

    // Locate in array
    issues.forEach(ele => {
        if (ele.ticket_id == ticket_id) {
            ticketToRender = ele;
            return;
        }
    });
    if (ticketToRender == null) { return; }

    // Render
    wholeCard.innerHTML = issueToString(ticketToRender);
}