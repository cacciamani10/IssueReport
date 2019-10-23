CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_on TIMESTAMP NOT NULL,
    last_login TIMESTAMP
);

CREATE TABLE tickets (
    ticket_id UUID PRIMARY KEY NOT NULL,
    created_by UUID NOT NULL REFERENCES users(user_id),
    ticket_subject TEXT NOT NULL,
    ticket_description TEXT NOT NULL,
    resolved BOOLEAN NOT NULL,
    created_on TIMESTAMP NOT NULL,
    resolved_on TIMESTAMP,
    resolved_by UUID REFERENCES users(user_id)
);
