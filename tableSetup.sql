CREATE TABLE users (
    user_id INT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_on TIMESTAMP NOT NULL,
    last_login TIMESTAMP
);

CREATE TABLE tickets (
    ticket_id SERIAL PRIMARY KEY,
    created_by INT NOT NULL REFERENCES users(user_id),
    ticket_subject TEXT NOT NULL,
    ticket_description TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_on TIMESTAMP NOT NULL,
    resolved_on TIMESTAMP,
    resolved_by INT REFERENCES users(user_id)
);
