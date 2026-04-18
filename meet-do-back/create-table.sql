CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  lastname   VARCHAR(100) NOT NULL,
  firstname  VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(50) NOT NULL DEFAULT 'USER',
  address    TEXT,
  verification_token VARCHAR(255),
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
); 

CREATE TABLE IF NOT EXISTS activity (
  id  SERIAL PRIMARY KEY,
  title   VARCHAR(100) NOT NULL,
  description  TEXT NOT NULL,
  image TEXT NOT NULL,
  address TEXT NOT NULL,
  theme TEXT NOT NULL,
  average_rating FLOAT,
  group_size INT NOT NULL,
  price FLOAT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  is_disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id_user INT,
  CONSTRAINT fk_user
    FOREIGN KEY (id_user)
    REFERENCES users(id)
    ON DELETE CASCADE
); 

CREATE TABLE IF NOT EXISTS review (
  id SERIAL PRIMARY KEY,
  rating DECIMAL(2,1) NOT NULL CHECK (rating BETWEEN 0 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  id_user INT NOT NULL,
  id_activity INT NOT NULL,
  CONSTRAINT fk_user
    FOREIGN KEY (id_user)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_activity
    FOREIGN KEY (id_activity)
    REFERENCES activity(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event (
  id SERIAL PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  id_activity INT NOT NULL,
  CONSTRAINT fk_activity
    FOREIGN KEY (id_activity)
    REFERENCES activity(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservation (
  id SERIAL PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  group_size INT NOT NULL,
  id_user INT NOT NULL,
  id_event INT NOT NULL,
  CONSTRAINT fk_user
    FOREIGN KEY (id_user)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_event
    FOREIGN KEY (id_event)
    REFERENCES event(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS report (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  enum_activity TEXT,
  enum_user TEXT,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  id_user INT,
  CONSTRAINT fk_user
    FOREIGN KEY (id_user)
    REFERENCES users(id)
    ON DELETE CASCADE
);
