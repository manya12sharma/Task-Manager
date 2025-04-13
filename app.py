from flask import Flask, request, jsonify 
from flask_cors import CORS 
from datetime import datetime
import sqlite3
import json

app = Flask(__name__)
CORS(app)

# Database initialization
def init_db():
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            deadline TEXT NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            reminder_shown BOOLEAN DEFAULT FALSE
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    print("GET /api/tasks")  # Debug log
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('SELECT * FROM tasks')
    tasks = [{'id': row[0], 'title': row[1], 'deadline': row[2], 
              'completed': bool(row[3]), 'reminder_shown': bool(row[4])} 
             for row in c.fetchall()]
    conn.close()
    print(f"Returning tasks: {tasks}")  # Debug log
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def add_task():
    print("POST /api/tasks")  # Debug log
    data = request.json
    print(f"Received data: {data}")  # Debug log
    
    try:
        conn = sqlite3.connect('tasks.db')
        c = conn.cursor()
        c.execute('INSERT INTO tasks (title, deadline) VALUES (?, ?)',
                  (data['title'], data['deadline']))
        conn.commit()
        task_id = c.lastrowid
        
        # Fetch the created task
        c.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
        row = c.fetchone()
        conn.close()
        
        task = {
            'id': row[0],
            'title': row[1],
            'deadline': row[2],
            'completed': bool(row[3]),
            'reminder_shown': bool(row[4])
        }
        print(f"Created task: {task}")  # Debug log
        return jsonify(task)
    except Exception as e:
        print(f"Error adding task: {str(e)}")  # Debug log
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    print(f"PUT /api/tasks/{task_id}")  # Debug log
    data = request.json
    print(f"Received data: {data}")  # Debug log
    
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('UPDATE tasks SET completed = ? WHERE id = ?',
              (data['completed'], task_id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    print(f"DELETE /api/tasks/{task_id}")  # Debug log
    conn = sqlite3.connect('tasks.db')
    c = conn.cursor()
    c.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)
