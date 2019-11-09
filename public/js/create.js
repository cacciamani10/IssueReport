'use strict';

const verifyForm = () => {
    let subject = document.getElementById('subject').value;
    let description = document.getElementById('description').value;
    let subjectError = document.getElementById('invalid-subject');
    let descriptionError = document.getElementById('invalid-description');
    let verified = true;

    if (subject == '') {
        subjectError.innerHTML = 'Enter a subject';
        verified = false;
    }

    if (description == '') {
        descriptionError.innerHTML = 'Enter a description';
        verified = false;
    }

    return verified;
}

window.addEventListener('load', () => {
    let form = document.getElementsByClassName('-form');
    let validation = Array.prototype.filter.call(form, (f) => {
        f.addEventListener('submit', (event) => {
            if (!verifyForm()) {
                event.preventDefualt();
                event.stopPropagation();
            }
        }, false);
    });
}, false);