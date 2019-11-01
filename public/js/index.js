const issues = [];
fetch('/getIssues')
    .then(res => {
        if (res.status !== 200) {
            console.log(res.status);
            return;
        }
        res.json().then(data => {
            if (data.length === 0) {
                window.location.href = '/create'; 
            }
            let tickets = document.getElementById('issues');
            tickets.innerHTML = '';
            for (let item of data) {
                item = item.row.replace(/"|\)|\(/g, '').split(',');
                console.log('Rendering card for', item);
                issues.push(item);
                tickets.innerHTML += issueToString(item);
            }
        });
    })
    .catch(err => console.log(err));

fetch('/user')
    .then(res => {
        if (res.status != 200) {
            console.log(res.status);
            return;
        }
        res.json().then(data => {
            console.log(data);
            let userOptions = document.getElementById('navbarDropdown');
        })
    })

function filterItems() {
    let found;
    const regex = new RegExp(document.getElementById('search-bar').value, 'i');
    let tickets = document.getElementById('issues');
    tickets.innerHTML = '';
    for (let item of issues) {
        found = false;
        for (let value of item) {
            if (regex.test(value)) {
                found = true;
                break;
            }
        }
        if(found) {
            tickets.innerHTML += issueToString(item);
            console.log(issueToString(item));
        }
    }
}

function issueToString(item) {
    let res = '';
    res += 
    `<div class="card" style="margin: 30px 12px;">
        <div class="card-header" style="font-weight: 500;">
            Ticket: #${item[0]}
        </div>
        <div class="card-body">
            <h5 class="card-title">${item[2]}</h5>
            <h6 class="card-subtitle mb-2 text-muted">Created by: ${item[1]}</h6>
            <p class="card-text">${item[3]}</p>`;
    if (item[4] === 'f') {
        res +=
            `<span class="badge badge-warning">Unresolved</span>
            <a href="#" class="card-link">Resolve</a>
        </div>
    </div>`;
    }
    else {
        res +=
            `<span class="badge badge-success">Resolved</span>
            <div class="card-footer text-muted">
                Resolved by: ${item[6]} on ${item[5]}
            </div>
        </div>
    </div>`
    }
    return res;
}