CREATE DATABASE IF NOT EXISTS signup;
USE signup;

CREATE TABLE students (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  birthday DATE,
  gender VARCHAR(255),
  major VARCHAR(255),
  grade VARCHAR(255),
  tenlop VARCHAR(255),
  token VARCHAR(255)
);
select*from students;
CREATE TABLE teachers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  birthday DATE,
  gender VARCHAR(255),
  major VARCHAR(255),
  grade VARCHAR(255),
  tenlop VARCHAR(255),
  token VARCHAR(255)
);
select*from teachers;
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20),
  teacher_id VARCHAR(20),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE ON UPDATE CASCADE
);
select*from posts;
CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT,
  student_id VARCHAR(20),
  teacher_id VARCHAR(20),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE ON UPDATE CASCADE
);
select*from comments;
 CREATE TABLE Messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversationId VARCHAR(255),
    senderId VARCHAR(255),
    message TEXT
  );
  select*from Messages;
   CREATE TABLE  Conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    members JSON NOT NULL
  )
  select*from Conversations;
drop table Conversations;