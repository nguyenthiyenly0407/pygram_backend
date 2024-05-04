CREATE DATABASE IF NOT EXISTS signup;
USE signup;

CREATE TABLE students (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50),
  email VARCHAR(50),
  password VARCHAR(50),
  birthday DATE,
  gender VARCHAR(10),
  major VARCHAR(30),
  grade VARCHAR(10),
  tenlop VARCHAR(10)
);

CREATE TABLE teachers (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50),
  email VARCHAR(50),
  password VARCHAR(50),
  birthday DATE,
  gender VARCHAR(10),
  major VARCHAR(30),
  grade VARCHAR(10),
  tenlop VARCHAR(10)
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
