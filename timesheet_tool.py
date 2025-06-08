from flask import Flask, request, jsonify
import pandas as pd
from datetime import datetime, timedelta
import random
from flask import Flask, request, jsonify, render_template
from datetime import datetime
from sqlalchemy import desc
from sqlalchemy import extract, func
from sqlalchemy.types import Integer
from sqlalchemy.sql import text #for altering table as string cannot be directly executed refer code specifically for altering projects table
#from werkzeug.security import generate_password_hash, check_password_hash
#from flask import session
import csv
import io
from flask import make_response
from flask import Flask, render_template, request, redirect, url_for, session, jsonify,send_file
from datetime import timedelta




app = Flask(__name__, static_folder='static')

from flask_sqlalchemy import SQLAlchemy

# Initialize Flask app and database
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///timesheet.db'  # SQLite database
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

app.secret_key = 'your-secret-key'  # Change this to something secure later
app.permanent_session_lifetime = timedelta(minutes=30)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Simple hardcoded user check
        if username == 'admin' and password == 'admin':
            session.permanent = True
            session['user'] = username
            return redirect(url_for('home'))  # redirect to your main app
        else:
            return render_template('login.html', error="Invalid credentials")

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))



# Define the Timesheet model
class Timesheet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String(100), nullable=False)
    task_type = db.Column(db.String(50), nullable=False)
    task_name = db.Column(db.String(100), nullable=False)
    resource_name = db.Column(db.String(100), nullable=False)
    hours_worked = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)

# Create the database tables
with app.app_context():
    db.create_all()


@app.route('/debug_static')
def debug_static():
    import os
    static_path = os.path.abspath(app.static_folder)
    return f"Static folder path: {static_path}"

@app.route('/debug_routes')
def debug_routes():
    return jsonify([rule.rule for rule in app.url_map.iter_rules()])

# Initialize an empty DataFrame to store timesheet data
data = {
    "Project Name": [],
    "Task Type": [],
    "Task Name": [],
    "Resource Name": [],
    "Hours Worked": [],
    "Date": []
}
timesheet_df = pd.DataFrame(data)

@app.route('/add_entry', methods=['POST'])
def add_entry():
    data = request.json

    # Validate input
    required_fields = ["Project Name", "Task Type", "Task Name", "Resource Name", "Hours Worked", "Date"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    if data["Task Type"] not in ["internal", "external", "meetings"]:
        return jsonify({"error": "Invalid Task Type. Must be one of 'internal', 'external', 'meetings'."}), 400

    try:
        entry = Timesheet(
            project_name=data["Project Name"],
            task_type=data["Task Type"],
            task_name=data["Task Name"],
            resource_name=data["Resource Name"],
            hours_worked=float(data["Hours Worked"]),
            date=datetime.strptime(data["Date"], "%Y-%m-%d").date()
        )
        db.session.add(entry)
        db.session.commit()
    except ValueError:
        return jsonify({"error": "Invalid data format."}), 400

    return jsonify({"message": "Entry added successfully."}), 200


    # Validate input
    required_fields = ["Project Name", "Task Type", "Task Name", "Resource Name", "Hours Worked", "Date"]
    for field in required_fields:
        if field not in entry:
            return jsonify({"error": f"Missing field: {field}"}), 400

    if entry["Task Type"] not in ["internal", "external", "meetings"]:
        return jsonify({"error": "Invalid Task Type. Must be one of 'internal', 'external', 'meetings'."}), 400

    try:
        entry["Hours Worked"] = float(entry["Hours Worked"])
        entry["Date"] = datetime.strptime(entry["Date"], "%Y-%m-%d")
    except ValueError as e:
        return jsonify({"error": "Invalid data format."}), 400

    # Add the entry to the DataFrame
    timesheet_df = pd.concat([timesheet_df, pd.DataFrame([entry])], ignore_index=True)
    return jsonify({"message": "Entry added successfully."}), 200

#editing an entry and updating timesheet.db
@app.route('/update_entry', methods=['PUT'])
def update_entry():
    data = request.json
    entry_id = data.get('id')

    if not entry_id:
        return jsonify({"error": "ID is required"}), 400

    entry = Timesheet.query.get(entry_id)

    if not entry:
        return jsonify({"error": "Entry not found"}), 404

    # Update fields with new values or keep old ones
    entry.project_name = data.get('Project Name', entry.project_name)
    entry.task_type = data.get('Task Type', entry.task_type)
    entry.task_name = data.get('Task Name', entry.task_name)
    entry.resource_name = data.get('Resource Name', entry.resource_name)
    entry.hours_worked = data.get('Hours Worked', entry.hours_worked)

    # Convert date string to a Python date object
    if 'Date' in data:
        try:
            entry.date = datetime.strptime(data['Date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Expected YYYY-MM-DD."}), 400

    db.session.commit()
    return jsonify({"message": "Entry updated successfully!"}), 200

#deleting an existing entry and updating the timesheet.db
@app.route('/delete_entry/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    entry = Timesheet.query.get(entry_id)
    if not entry:
        return jsonify({"error": "Entry not found"}), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Entry deleted successfully!"}), 200


@app.route('/filter', methods=['GET'])
def filter_entries():
    global timesheet_df

    # Get filter parameters
    project_name = request.args.get('project_name')
    resource_name = request.args.get('resource_name')

    # Filter the DataFrame
    filtered_df = timesheet_df
    if project_name:
        filtered_df = filtered_df[filtered_df["Project Name"] == project_name]
    if resource_name:
        filtered_df = filtered_df[filtered_df["Resource Name"] == resource_name]

    return jsonify(filtered_df.to_dict(orient='records')), 200

# get all timesheet entries along with pagination
@app.route('/get_all', methods=['GET'])
def get_all_entries():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))

    if per_page == 0:  # Fetch all records without pagination
        query = Timesheet.query.order_by(Timesheet.date.desc())  # Sorting by date in descending order
        total_records = query.count()
        entries = query.all()
        return jsonify({
            "entries": [
                {
                    "id": entry.id,
                    "Project Name": entry.project_name,
                    "Task Type": entry.task_type,
                    "Task Name": entry.task_name,
                    "Resource Name": entry.resource_name,
                    "Hours Worked": entry.hours_worked,
                    "Date": entry.date.strftime('%Y-%m-%d') if entry.date else "N/A"
                }
                for entry in entries
            ],
            "total_records": total_records
        }), 200

    # Handle pagination with sorting
    query = Timesheet.query.order_by(Timesheet.date.desc())  # Sorting by date in descending order
    total_records = query.count()
    entries = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "entries": [
            {
                "id": entry.id,
                "Project Name": entry.project_name,
                "Task Type": entry.task_type,
                "Task Name": entry.task_name,
                "Resource Name": entry.resource_name,
                "Hours Worked": entry.hours_worked,
                "Date": entry.date.strftime('%Y-%m-%d') if entry.date else "N/A"
            }
            for entry in entries.items
        ],
        "total_records": total_records,
        "current_page": page,
        "total_pages": entries.pages
    }), 200





@app.route('/add_dummy_entries', methods=['POST'])
def add_dummy_entries():
    projects = ["Project Alpha", "Project Beta", "Project Gamma"]
    task_types = ["internal", "external", "meetings"]
    task_names = ["Code Review", "Development", "Team Meeting", "Testing"]
    resource_names = ["John Doe", "Jane Smith", "Alice Johnson", "Bob Brown"]

    for _ in range(100):
        entry = Timesheet(
            project_name=random.choice(projects),
            task_type=random.choice(task_types),
            task_name=random.choice(task_names),
            resource_name=random.choice(resource_names),
            hours_worked=round(random.uniform(1, 8), 1),
            date=(datetime.now() - timedelta(days=random.randint(0, 30))).date()
        )
        db.session.add(entry)
    db.session.commit()

    return jsonify({"message": "100 dummy entries added successfully."}), 200


# to avoid 404 error on localhost
#@app.route('/', methods=['GET'])
#def home():
#    return jsonify({"message": "Welcome to the Timesheet API. Use endpoints like /add_entry, /filter, or /get_all."}), 200

@app.route('/')
def home():
    if 'user' not in session:
        return redirect('/login')
    return render_template('index.html')


#app = Flask(__name__, static_folder=r"C:\Users\kaush\OneDrive\Desktop\timesheet_project\static")
# API endpoint to fetch all unique quarters for the dropdown filter for bandwidth report, get_report
@app.route('/get_resource_hours_quarters', methods=['GET'])
def get_resource_hours_quarters():
    # Fetch distinct quarters from the resource hours report
    quarters = db.session.query(
        db.func.concat(
            "Q",
            (db.func.cast((db.func.extract('month', Timesheet.date) - 1) / 3 + 1, Integer)),
            " ",
            db.func.extract('year', Timesheet.date)
        ).label("quarter")
    ).distinct().order_by("quarter").all()

    # Format the result as a list of quarters
    result = [row[0] for row in quarters]
    return jsonify(result), 200


@app.route('/get_report', methods=['GET'])
def get_report():
    selected_quarter_report = request.args.get('quarter', 'all')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))

    quarter_case = db.case(
        (db.extract('month', Timesheet.date).between(1, 3), 'Q1'),
        (db.extract('month', Timesheet.date).between(4, 6), 'Q2'),
        (db.extract('month', Timesheet.date).between(7, 9), 'Q3'),
        (db.extract('month', Timesheet.date).between(10, 12), 'Q4'),
        else_='Unknown'
    )

    base_query = db.session.query(
        Timesheet.resource_name,
        db.func.sum(Timesheet.hours_worked).label('total_hours'),
        quarter_case.label('quarter'),
        db.func.extract('year', Timesheet.date).label('year')
    ).group_by(
        Timesheet.resource_name,
        quarter_case,
        db.func.extract('year', Timesheet.date)
    ).order_by(
        db.func.extract('year', Timesheet.date),
        quarter_case
    )

    if selected_quarter_report.lower() != 'all':
        base_query = base_query.having(
            db.func.concat(quarter_case, " ", db.func.extract('year', Timesheet.date)) == selected_quarter_report
        )

    try:
        total_entries = base_query.count()
        paginated_query = base_query.offset((page - 1) * per_page).limit(per_page)
        entries = paginated_query.all()
    except Exception as e:
        return jsonify({"error": f"Query execution failed: {str(e)}"}), 500

    result = []
    for resource_name, hours, quarter, year in entries:
        hours = hours or 0
        days = round(hours / 8)
        result.append({
            "Resource Name": resource_name,
            "Total Hours": f"{hours} ({days} days)",
            "Quarter": f"{quarter} {int(year)}"
        })

    return jsonify({
        "entries": result,
        "current_page": page,
        "total_pages": (total_entries + per_page - 1) // per_page
    }), 200

@app.route('/get_project_report', methods=['GET'])
def get_project_report():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))

        # Base query: total hours grouped by project name
        base_query = db.session.query(
            Timesheet.project_name,
            db.func.sum(Timesheet.hours_worked).label('total_hours')
        ).group_by(Timesheet.project_name)

        # Total records for pagination
        total_records = base_query.count()

        # Apply pagination
        report = base_query.offset((page - 1) * per_page).limit(per_page).all()

        # Format result
        result = [
            {
                "Project Name": row[0],
                "Total Hours": round(row[1], 2)
            }
            for row in report
        ]

        return jsonify({
            "entries": result,
            "current_page": page,
            "total_pages": (total_records + per_page - 1) // per_page
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch project report: {str(e)}"}), 500


# all about Pipeline tabs
class Pipeline(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(150), nullable=False)
    acv = db.Column(db.Float, nullable=False)
    implementation_amount = db.Column(db.Float, nullable=False)
    region = db.Column(db.String(50), nullable=False)
    ae_name = db.Column(db.String(100), nullable=False)
    se_name = db.Column(db.String(100), nullable=False)
    hubspot_deal_url = db.Column(db.String(300), nullable=False)
    project_plan_url = db.Column(db.String(300), nullable=False)
    expected_close_date = db.Column(db.Date, nullable=False)
    stage = db.Column(db.String(50), nullable=False)
with app.app_context():
    db.create_all()

@app.route('/add_pipeline_entry', methods=['POST'])
def add_pipeline_entry():
    data = request.json
    try:
        entry = Pipeline(
            company_name=data["Company Name"],
            acv=float(data["ACV"]),
            implementation_amount=float(data["Implementation Amount"]),
            region=data["Region"],
            ae_name=data["AE Name"],
            se_name=data["SE Name"],
            hubspot_deal_url=data["Hubspot Deal URL"],
            project_plan_url=data["Project Plan URL"],
            expected_close_date=datetime.strptime(data["Expected Close Date"], "%Y-%m-%d").date(),
            stage=data["Stage"]
        )
        db.session.add(entry)
        db.session.commit()
        return jsonify({"message": "Pipeline entry added successfully."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/get_pipeline_entries', methods=['GET'])
def get_pipeline_entries():
    entries = Pipeline.query.all()
    result = [
        {
            "id": entry.id,
            "Company Name": entry.company_name,
            "ACV": entry.acv,
            "Implementation Amount": entry.implementation_amount,
            "Region": entry.region,
            "AE Name": entry.ae_name,
            "SE Name": entry.se_name,
            "Hubspot Deal URL": entry.hubspot_deal_url,
            "Project Plan URL": entry.project_plan_url,
            "Expected Close Date": entry.expected_close_date.strftime("%Y-%m-%d"),
            "Stage": entry.stage
        }
        for entry in entries
    ]
    return jsonify(result), 200

@app.route('/update_pipeline_entry', methods=['PUT'])
def update_pipeline_entry():
    data = request.json
    entry = Pipeline.query.get(data['id'])
    if not entry:
        return jsonify({"error": "Pipeline entry not found"}), 404

    entry.company_name = data.get("Company Name", entry.company_name)
    entry.acv = data.get("ACV", entry.acv)
    entry.implementation_amount = data.get("Implementation Amount", entry.implementation_amount)
    entry.region = data.get("Region", entry.region)
    entry.ae_name = data.get("AE Name", entry.ae_name)
    entry.se_name = data.get("SE Name", entry.se_name)
    entry.hubspot_deal_url = data.get("Hubspot Deal URL", entry.hubspot_deal_url)
    entry.project_plan_url = data.get("Project Plan URL", entry.project_plan_url)
    if "Expected Close Date" in data:
        entry.expected_close_date = datetime.strptime(data["Expected Close Date"], "%Y-%m-%d").date()
    entry.stage = data.get("Stage", entry.stage)

    db.session.commit()
    return jsonify({"message": "Pipeline entry updated successfully!"}), 200

@app.route('/delete_pipeline_entry/<int:entry_id>', methods=['DELETE'])
def delete_pipeline_entry(entry_id):
    entry = Pipeline.query.get(entry_id)
    if not entry:
        return jsonify({"error": "Pipeline entry not found"}), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Pipeline entry deleted successfully!"}), 200

# creating DB table for projects module
class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(150), nullable=False)
    implementation_cost = db.Column(db.Float, nullable=False)
    order_form = db.Column(db.String(300), nullable=True)  # Path to uploaded file
    scope_of_work = db.Column(db.String(300), nullable=True)  # Path to uploaded file
    sales_name = db.Column(db.String(100), nullable=False)
    solution_engineer_name = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    expected_close_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(10), nullable=True)
    region = db.Column(db.String(50), nullable=True)
    project_started = db.Column(db.String(3), nullable=False, default='No')  # Add this
    project_completed = db.Column(db.String(3), nullable=False, default='No')  # Add this

with app.app_context():
    db.create_all()

#added specifically to alter the table to add status column
#with app.app_context():
#    with db.engine.connect() as connection:
#        result = connection.execute(text('PRAGMA table_info(project)'))
#        columns = [row['name'] for row in result]
#        print("Columns in 'project' table:", columns)

# for adding attachments required classes and function
from werkzeug.utils import secure_filename
import os

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Add project API and function
@app.route('/add_project', methods=['POST'])
def add_project():
    data = request.form
    files = request.files
    try:
        order_form_path = None
        scope_of_work_path = None

        # Save uploaded files
        if 'order_form' in files and files['order_form'].filename:
            order_form = files['order_form']
            order_form_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(order_form.filename))
            order_form.save(order_form_path)

        if 'scope_of_work' in files and files['scope_of_work'].filename:
            scope_of_work = files['scope_of_work']
            scope_of_work_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(scope_of_work.filename))
            scope_of_work.save(scope_of_work_path)

# adding projects to timesheet.db
        project = Project(
            customer_name=data['customer_name'],
            implementation_cost=float(data['implementation_cost']),
            order_form=order_form_path,
            scope_of_work=scope_of_work_path,
            sales_name=data['sales_name'],
            solution_engineer_name=data['solution_engineer_name'],
            start_date=datetime.strptime(data['start_date'], "%Y-%m-%d").date(),
            expected_close_date=datetime.strptime(data['expected_close_date'], "%Y-%m-%d").date(),
            status=data['status'],
            region=data['region'],  # Capture the region
            project_started=data['project_started'],  # Default to "No"
            project_completed=data['project_completed']  # Default to "No"
        )
        db.session.add(project)
        db.session.commit()
        return jsonify({'message': 'Project added successfully!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

#get projects API code and app route
@app.route('/get_projects', methods=['GET'])
def get_projects():
    try:
        import math  # make sure this is at the top of your file

        # Read pagination params
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))

        # Base query
        query = Project.query
        total_records = query.count()
        total_pages = math.ceil(total_records / per_page)
        projects = query.offset((page - 1) * per_page).limit(per_page).all()

        # Format results
        result = {
            "projects": [
                {
                    'id': project.id,
                    'Customer Name': project.customer_name,
                    'Implementation Cost': project.implementation_cost,
                    'Order Form': project.order_form,
                    'Scope of Work': project.scope_of_work,
                    'Sales Name': project.sales_name,
                    'Solution Engineer Name': project.solution_engineer_name,
                    'Start Date': project.start_date.strftime("%Y-%m-%d") if project.start_date else '',
                    'Expected Close Date': project.expected_close_date.strftime("%Y-%m-%d") if project.expected_close_date else '',
                    'Status': project.status,
                    'Region': project.region,
                    'Project Started': project.project_started,
                    'Project Completed': project.project_completed
                }
                for project in projects
            ],
            "total_records": total_records,
            "current_page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch projects: {str(e)}"}), 500

@app.route('/get_project/<int:project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    return jsonify({
        "id": project.id,
        "Customer Name": project.customer_name,
        "Implementation Cost": project.implementation_cost,
        "Order Form": project.order_form,
        "Scope of Work": project.scope_of_work,
        "Sales Name": project.sales_name,
        "Solution Engineer Name": project.solution_engineer_name,
        "Start Date": project.start_date.strftime("%Y-%m-%d") if project.start_date else '',
        "Expected Close Date": project.expected_close_date.strftime("%Y-%m-%d") if project.expected_close_date else '',
        "Status": project.status,
        "Region": project.region,
        "Project Started": project.project_started,
        "Project Completed": project.project_completed
    }), 200


# update the project entry code
@app.route('/update_project/<int:id>', methods=['PUT'])
def update_project(id):
    data = request.form
    files = request.files

    project = Project.query.get(id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    # File handling (optional)
    order_form_path = project.order_form
    scope_of_work_path = project.scope_of_work

    if 'order_form' in files and files['order_form'].filename:
        order_form = files['order_form']
        order_form_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(order_form.filename))
        order_form.save(order_form_path)

    if 'scope_of_work' in files and files['scope_of_work'].filename:
        scope_of_work = files['scope_of_work']
        scope_of_work_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(scope_of_work.filename))
        scope_of_work.save(scope_of_work_path)

    # Update fields
    project.customer_name = data.get('customer_name', project.customer_name)
    project.implementation_cost = float(data.get('implementation_cost', project.implementation_cost))
    project.order_form = order_form_path
    project.scope_of_work = scope_of_work_path
    project.sales_name = data.get('sales_name', project.sales_name)
    project.solution_engineer_name = data.get('solution_engineer_name', project.solution_engineer_name)
    project.start_date = datetime.strptime(data.get('start_date', project.start_date.strftime('%Y-%m-%d')), '%Y-%m-%d')
    project.expected_close_date = datetime.strptime(data.get('expected_close_date', project.expected_close_date.strftime('%Y-%m-%d')), '%Y-%m-%d')
    project.status = data.get('status', project.status)
    project.region = data.get('region', project.region)
    project.project_started = data.get('project_started', project.project_started)
    project.project_completed = data.get('project_completed', project.project_completed)

    db.session.commit()
    return jsonify({'message': 'Project updated successfully!'}), 200



#delete project entry code
@app.route('/delete_project/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted successfully'}), 200

# for fetching project names from project table and display in new timesheet entry modal
@app.route('/get_project_names', methods=['GET'])
def get_project_names():
    projects = Project.query.all()
    project_names = [project.customer_name for project in projects]
    return jsonify(project_names), 200

# for importing timesheet entries
import csv
from io import StringIO

@app.route('/import_timesheet', methods=['POST'])
def import_timesheet():
    file = request.files.get('file')
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    file_content = StringIO(file.stream.read().decode('utf-8'))
    reader = csv.DictReader(file_content)
    success_count = 0
    error_logs = []
    # Fetch all valid project names (customer names)
    valid_projects = {project.customer_name for project in Project.query.all()}

    for row in reader:
        try:
                        # Validate Project Name
            if row['Project Name'] not in valid_projects:
                raise ValueError(f"Invalid Project Name: {row['Project Name']}")
            entry = Timesheet(
                project_name=row['Project Name'],
                task_type=row['Task Type'],
                task_name=row['Task Name'],
                resource_name=row['Resource Name'],
                hours_worked=float(row['Hours Worked']),
                date=datetime.strptime(row['Date'], '%Y-%m-%d').date()
            )
            db.session.add(entry)
            success_count += 1
        except Exception as e:
            error_logs.append(f"Row {reader.line_num}: {str(e)}")

    db.session.commit()
    return jsonify({
        "success": success_count,
        "errors": len(error_logs),
        "error_logs": error_logs
    }), 200

#for importing project entries
@app.route('/import_projects', methods=['POST'])
def import_projects():
    file = request.files.get('file')
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    file_content = StringIO(file.stream.read().decode('utf-8'))
    reader = csv.DictReader(file_content)
    success_count = 0
    error_logs = []

    for row in reader:
        try:
            project = Project(
                customer_name=row['Customer Name'],
                implementation_cost=float(row['Implementation Cost']),
                order_form=row.get('Order Form') or None,
                scope_of_work=row.get('Scope of Work') or None,
                sales_name=row['Sales Name'],
                solution_engineer_name=row['Solution Engineer Name'],
                start_date=datetime.strptime(row['Start Date'], '%Y-%m-%d').date(),
                expected_close_date=datetime.strptime(row['Expected Close Date'], '%Y-%m-%d').date(),
                status=row.get('Status'),
                region=row.get('Region'),  # Handle region during import
                project_started=row.get('Project Started', 'No'),
                project_completed=row.get('Project Completed', 'No')  # New column
            )
            db.session.add(project)
            success_count += 1
        except Exception as e:
            error_logs.append(f"Row {reader.line_num}: {str(e)}")

    db.session.commit()
    return jsonify({
        "success": success_count,
        "errors": len(error_logs),
        "error_logs": error_logs
    }), 200


# for filter operations on timesheet UI

@app.route('/filter_timesheet', methods=['GET'])
def filter_timesheet():
    project_name = request.args.get('project_name')
    resource_name = request.args.get('resource_name')
    task_type = request.args.get('task_type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = Timesheet.query

    if project_name:
        query = query.filter(Timesheet.project_name == project_name)
    if resource_name:
        query = query.filter(Timesheet.resource_name == resource_name)
    if task_type:
        query = query.filter(Timesheet.task_type == task_type)
    if start_date:
        query = query.filter(Timesheet.date >= datetime.strptime(start_date, '%Y-%m-%d'))
    if end_date:
        query = query.filter(Timesheet.date <= datetime.strptime(end_date, '%Y-%m-%d'))

    entries = query.order_by(desc(Timesheet.id)).all()
    result = [
        {
            "id": entry.id,
            "Project Name": entry.project_name,
            "Task Type": entry.task_type,
            "Task Name": entry.task_name,
            "Resource Name": entry.resource_name,
            "Hours Worked": entry.hours_worked,
            "Date": entry.date.strftime("%Y-%m-%d")
        }
        for entry in entries
    ]

    return jsonify(result), 200

@app.route('/filter_projects', methods=['GET'])
def filter_projects():
    try:
        import math  # make sure this is imported at the top of your file

        # Get filter and pagination parameters from request
        status = request.args.get('status', '').strip()
        region = request.args.get('region', '').strip()
        project_started = request.args.get('project_started', '').strip()
        project_completed = request.args.get('project_completed', '').strip()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))

        # Base query
        query = Project.query

        # Apply filters if provided
        if status:
            query = query.filter(Project.status == status)
        if region:
            query = query.filter(Project.region == region)
        if project_started:
            query = query.filter(Project.project_started == project_started)
        if project_completed:
            query = query.filter(Project.project_completed == project_completed)

        # Pagination
        total_records = query.count()
        total_pages = math.ceil(total_records / per_page)
        projects = query.offset((page - 1) * per_page).limit(per_page).all()

        # Format results
        result = {
            "projects": [
                {
                    "id": project.id,
                    "Customer Name": project.customer_name,
                    "Implementation Cost": project.implementation_cost,
                    "Order Form": project.order_form,
                    "Scope of Work": project.scope_of_work,
                    "Sales Name": project.sales_name,
                    "Solution Engineer Name": project.solution_engineer_name,
                    "Start Date": project.start_date.strftime("%Y-%m-%d") if project.start_date else '',
                    "Expected Close Date": project.expected_close_date.strftime("%Y-%m-%d") if project.expected_close_date else '',
                    "Status": project.status,
                    "Region": project.region,
                    "Project Started": project.project_started,
                    "Project Completed": project.project_completed
                }
                for project in projects
            ],
            "total_records": total_records,
            "current_page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch projects: {str(e)}"}), 500



# code for generating quarterly implementation revenue report
@app.route('/get_quarterly_revenue', methods=['GET'])
def get_quarterly_revenue():
    # Get the selected quarter and pagination params from request
    selected_quarter = request.args.get('quarter', 'all')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))

    # Define quarter and category case
    quarter_expr = func.cast((extract('month', Project.start_date) - 1) / 3 + 1, Integer)
    category_expr = db.case(
        (Project.project_started == 'Yes', 'Closed'),
        else_='Pipeline'
    )

    # Base query: revenue grouped by quarter + category
    base_query = db.session.query(
        extract('year', Project.start_date).label('year'),
        quarter_expr.label('quarter'),
        category_expr.label('category'),
        func.sum(Project.implementation_cost).label('total_revenue')
    ).group_by(
        extract('year', Project.start_date),
        quarter_expr,
        category_expr
    ).order_by(
        extract('year', Project.start_date),
        quarter_expr
    )

    # Apply quarter filter if not "all"
    if selected_quarter.lower() != 'all':
        base_query = base_query.having(
            db.func.concat(
                "Q", quarter_expr, " ", extract('year', Project.start_date)
            ) == selected_quarter
        )

    try:
        total_entries = base_query.count()
        paginated_results = base_query.offset((page - 1) * per_page).limit(per_page).all()
    except Exception as e:
        return jsonify({"error": f"Failed to execute query: {str(e)}"}), 500

    # Format result
    result = [
        {
            "Quarter": f"Q{row.quarter} {row.year}",
            "Category": row.category,
            "Total Revenue": round(row.total_revenue, 2) if row.total_revenue else 0
        }
        for row in paginated_results
    ]

    return jsonify({
        "entries": result,
        "current_page": page,
        "total_pages": (total_entries + per_page - 1) // per_page
    }), 200

# for providing filters for get_quarterly_revenue
@app.route('/get_quarters', methods=['GET'])
def get_quarters():
    # Fetch distinct quarters from the database
    quarters = db.session.query(
        db.func.concat(
            "Q",
            (db.func.cast((db.func.extract('month', Project.start_date) - 1) / 3 + 1, Integer)),
            " ",
            db.func.extract('year', Project.start_date)
        ).label("quarter")
    ).distinct().order_by("quarter").all()

    # Format the result as a list of quarters
    result = [row[0] for row in quarters]
    return jsonify(result), 200

# for drawing Gantt chart
@app.route('/get_gantt_data', methods=['GET'])
def get_gantt_data():
    try:
        entries = Timesheet.query.order_by(Timesheet.date).all()

        result = [
            {
                "id": entry.id,
                "Project Name": entry.project_name,
                "Resource Name": entry.resource_name,
                "Start Date": entry.date.strftime('%Y-%m-%d'),
                "End Date": (entry.date + timedelta(days=1)).strftime('%Y-%m-%d')  # Assume 1-day task duration
            }
            for entry in entries
        ]

        return jsonify({"entries": result}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch Gantt chart data: {str(e)}"}), 500

#defining DB model for product issues
class ProductIssue(db.Model):
    __tablename__ = 'product_issues'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    issue_type = db.Column(db.String(50), nullable=False)  # "Bug", "Enhancement", "Feature Request"
    jira_l2_ticket = db.Column(db.String(255), nullable=False)  # Ticket Link
    raised_on = db.Column(db.Date, nullable=False)  # Raised Date
    eta = db.Column(db.String(100), nullable=True)  # ETA
    project_name = db.Column(db.String(255), nullable=True)  # Linked to Projects
    current_status = db.Column(db.String(50), nullable=True)  # "Feasibility Check", "WIP", etc.
    use_case_link = db.Column(db.String(255), nullable=True)  # Documentation Link
    chargeable = db.Column(db.String(10), nullable=False, default='No')  # "Yes" or "No"
    region = db.Column(db.String(50), nullable=True)
    comments = db.Column(db.String(300), nullable=True)

    def __repr__(self):
        return f"<ProductIssue {self.issue_type} - {self.jira_l2_ticket}>"


# function for fetching all product issues
@app.route('/get_product_issues', methods=['GET'])
def get_product_issues():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        pagination = ProductIssue.query.paginate(page=page, per_page=per_page, error_out=False)
        issues = pagination.items

        issues_list = []
        for issue in issues:
            issues_list.append({
                "id": issue.id,
                "Issue Type": issue.issue_type,
                "Jira/L2 Ticket Link": issue.jira_l2_ticket,
                "Raised On": issue.raised_on.strftime('%Y-%m-%d') if issue.raised_on else "",  # ✅ Ensure `YYYY-MM-DD`
                "ETA": issue.eta,
                "Project Name": issue.project_name,
                "Current Status": issue.current_status,
                "Use Case Document Link": issue.use_case_link,
                "Chargeable": issue.chargeable,
                "Region": issue.region,
                "Comments": issue.comments
            })

        return jsonify({
            "entries": issues_list,
            "total_pages": pagination.pages,
            "current_page": page
        }), 200

    except Exception as e:
        print(f"❌ Error fetching product issues: {str(e)}")
        return jsonify({"error": "Failed to fetch product issues", "details": str(e)}), 500




#function for adding a new product issue
@app.route('/add_product_issue', methods=['POST'])
def add_product_issue():
    data = request.json
    required_fields = ['issue_type', 'jira_l2_ticket', 'raised_on']

    # Validate required fields
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    new_issue = ProductIssue(
        issue_type=data['issue_type'],
        jira_l2_ticket=data['jira_l2_ticket'],
        raised_on=datetime.strptime(data['raised_on'], '%Y-%m-%d'),
        eta=data.get('eta', None),
        project_name=data.get('project_name', None),
        current_status=data.get('current_status', None),
        use_case_link=data.get('use_case_link', None),
        chargeable=data.get('chargeable', None),
        region=data.get('Region', None),
        comments=data.get('Comments', None)
    )

    db.session.add(new_issue)
    db.session.commit()

    return jsonify({"message": "Issue added successfully"}), 201

# function for importing product issues
import csv
from io import StringIO

@app.route('/import_product_issues', methods=['POST'])
def import_product_issues():
    file = request.files.get('file')
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    file_content = StringIO(file.stream.read().decode('utf-8'))
    reader = csv.DictReader(file_content)
    success_count = 0
    error_logs = []

    for row in reader:
        try:
            # Validate required fields
            required_fields = ["Issue Type", "Jira/L2 Ticket Link", "Raised On"]
            for field in required_fields:
                if not row.get(field):
                    raise ValueError(f"Missing required field: {field}")

            raised_on = datetime.strptime(row['Raised On'], '%Y-%m-%d')
            eta = row.get('ETA')

            issue = ProductIssue(
                issue_type=row["Issue Type"],
                jira_l2_ticket=row["Jira/L2 Ticket Link"],
                raised_on=raised_on,
                eta=row.get("ETA"),
                project_name=row.get("Project Name"),
                current_status=row.get("Current Status"),
                use_case_link=row.get("Use Case Document Link"),
                chargeable=row.get("Chargeable", "No"),
                region=row.get("Region"),
                comments=row.get("Comments")

                # Commenting region/comments unless you're adding them to the DB model
                # region=row.get("Region"),
                # comments=row.get("Comments")
            )

            db.session.add(issue)
            success_count += 1

        except Exception as e:
            error_logs.append(f"Row {reader.line_num}: {str(e)}")

    db.session.commit()

    return jsonify({
        "success": success_count,
        "errors": len(error_logs),
        "error_logs": error_logs
    }), 200





#edit route for product issue
@app.route('/update_product_issue/<int:id>', methods=['PUT'])
def update_product_issue(id):
    try:
        data = request.get_json()
        issue = ProductIssue.query.get(id)

        if not issue:
            return jsonify({"error": "Product Issue not found"}), 404

        # Update the existing fields
        issue.issue_type = data.get('issue_type', issue.issue_type)
        issue.jira_l2_ticket = data.get('jira_l2_ticket', issue.jira_l2_ticket)
        issue.raised_on = datetime.strptime(data.get('raised_on', issue.raised_on.strftime('%Y-%m-%d')), '%Y-%m-%d') if data.get('raised_on') else issue.raised_on
        issue.eta = data.get('eta', issue.eta)
        issue.project_name = data.get('project_name', issue.project_name)
        issue.current_status = data.get('current_status', issue.current_status)
        issue.use_case_link = data.get('use_case_link', issue.use_case_link)
        issue.chargeable = data.get('chargeable', issue.chargeable)
        issue.region = data.get('region', issue.region)
        issue.comments = data.get('comments', issue.comments)

        db.session.commit()
        return jsonify({"message": "Product Issue updated successfully!"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to update product issue", "details": str(e)}), 500



#delete route for product issue
@app.route('/delete_product_issue/<int:id>', methods=['DELETE'])
def delete_product_issue(id):
    try:
        issue = ProductIssue.query.get(id)
        if not issue:
            return jsonify({"error": "Product Issue not found"}), 404

        db.session.delete(issue)
        db.session.commit()
        return jsonify({"message": "Product Issue deleted successfully!"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to delete product issue", "details": str(e)}), 500

#filter route for product issue using issue type, raised on, and current status fields
@app.route('/filter_product_issues', methods=['GET'])
def filter_product_issues():
    issue_type = request.args.get('issue_type')
    raised_on = request.args.get('raised_on')
    current_status = request.args.get('current_status')

    query = ProductIssue.query

    if issue_type:
        query = query.filter(ProductIssue.issue_type == issue_type)
    if raised_on:
        query = query.filter(ProductIssue.raised_on == raised_on)
    if current_status:
        query = query.filter(ProductIssue.current_status == current_status)

    issues = query.all()

    return jsonify([
        {
            "id": issue.id,
            "Issue Type": issue.issue_type,
            "Jira/L2 Ticket Link": issue.jira_l2_ticket,
            "Raised On": issue.raised_on,
            "ETA": issue.eta,
            "Project Name": issue.project_name,
            "Current Status": issue.current_status,
            "Use Case Document Link": issue.use_case_link,
            "Chargeable": issue.chargeable,
            "Region": issue.region,
            "Comments": issue.comments
        } for issue in issues
    ]), 200

#route to get a specific product issues using id
@app.route('/get_product_issues/<int:id>', methods=['GET'])
def get_product_issue(id):
    issue = ProductIssue.query.get(id)

    if not issue:
        return jsonify({"error": "Product issue not found"}), 404

    return jsonify({
        "id": issue.id,
        "Issue Type": issue.issue_type,
        "Jira/L2 Ticket Link": issue.jira_l2_ticket,
        "Raised On": issue.raised_on.strftime('%Y-%m-%d') if issue.raised_on else "",  # ✅ `YYYY-MM-DD`
        "ETA": issue.eta,
        "Project Name": issue.project_name,
        "Current Status": issue.current_status,
        "Use Case Document Link": issue.use_case_link,
        "Chargeable": issue.chargeable,
        "Region": issue.region,
        "Comments": issue.comments
    }), 200

#route for summary of product issues on top of product issues pages
@app.route('/product_issues_summary', methods=['GET'])
def product_issues_summary():
    from sqlalchemy import func

    status_summary = db.session.query(
        ProductIssue.current_status,
        func.count(ProductIssue.id)
    ).group_by(ProductIssue.current_status).all()

    type_summary = db.session.query(
        ProductIssue.issue_type,
        func.count(ProductIssue.id)
    ).group_by(ProductIssue.issue_type).all()

    return jsonify({
        "status_summary": dict(status_summary),
        "type_summary": dict(type_summary)
    })

#route for filtering projects
@app.route('/filter_projects', methods=['GET'])
def filter_projects_v2():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    region = request.args.get('region')
    started = request.args.get('project_started')
    completed = request.args.get('project_completed')

    query = Project.query

    if start_date:
        query = query.filter(Project.start_date >= datetime.strptime(start_date, '%Y-%m-%d'))
    if end_date:
        query = query.filter(Project.start_date <= datetime.strptime(end_date, '%Y-%m-%d'))
    if region:
        query = query.filter(Project.region == region)
    if started:
        query = query.filter(Project.project_started == started)
    if completed:
        query = query.filter(Project.project_completed == completed)

    results = query.all()
    data = []
    for proj in results:
        data.append({
            "id": proj.id,
            "Customer Name": proj.customer_name,
            "Implementation Cost": proj.implementation_cost,
            "Order Form": proj.order_form,
            "Scope of Work": proj.scope_of_work,
            "Sales Name": proj.sales_name,
            "Solution Engineer Name": proj.solution_engineer_name,
            "Start Date": proj.start_date.strftime('%Y-%m-%d') if proj.start_date else '',
            "Expected Close Date": proj.expected_close_date.strftime('%Y-%m-%d') if proj.expected_close_date else '',
            "Status": proj.status,
            "Region": proj.region,
            "Project Started": proj.project_started,
            "Project Completed": proj.project_completed
        })

    return jsonify(data), 200

@app.route('/projects_summary', methods=['GET'])
def projects_summary():
    try:
        active_projects = Project.query.filter_by(project_started="Yes", project_completed="No").count()
        total_revenue = db.session.query(db.func.sum(Project.implementation_cost)).filter_by(project_started="Yes").scalar() or 0
        return jsonify({
            "active_projects": active_projects,
            "total_revenue": round(total_revenue, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/export_projects_all')
def export_projects_all():
    projects = Project.query.all()

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['Customer Name', 'Implementation Cost', 'Order Form', 'Scope of Work', 'Sales Name',
                 'Solution Engineer Name', 'Start Date', 'Expected Close Date', 'Status',
                 'Region', 'Project Started', 'Project Completed'])

    for p in projects:
        cw.writerow([
            p.customer_name, p.implementation_cost, p.order_form, p.scope_of_work,
            p.sales_name, p.solution_engineer_name, p.start_date.strftime('%Y-%m-%d'),
            p.expected_close_date.strftime('%Y-%m-%d'), p.status, p.region,
            p.project_started, p.project_completed
        ])

    output = make_response(si.getvalue())
    output.headers['Content-Disposition'] = 'attachment; filename=all_projects.csv'
    output.headers['Content-type'] = 'text/csv'
    return output

@app.route('/export_projects_filtered')
def export_projects_filtered():
    region = request.args.get('region', '').strip()
    project_started = request.args.get('project_started', '').strip()
    project_completed = request.args.get('project_completed', '').strip()

    query = Project.query

    if region:
        query = query.filter(Project.region == region)
    if project_started:
        query = query.filter(Project.project_started == project_started)
    if project_completed:
        query = query.filter(Project.project_completed == project_completed)

    projects = query.all()

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['Customer Name', 'Implementation Cost', 'Order Form', 'Scope of Work', 'Sales Name',
                 'Solution Engineer Name', 'Start Date', 'Expected Close Date', 'Status',
                 'Region', 'Project Started', 'Project Completed'])

    for p in projects:
        cw.writerow([
            p.customer_name, p.implementation_cost, p.order_form, p.scope_of_work,
            p.sales_name, p.solution_engineer_name, p.start_date.strftime('%Y-%m-%d'),
            p.expected_close_date.strftime('%Y-%m-%d'), p.status, p.region,
            p.project_started, p.project_completed
        ])

    output = make_response(si.getvalue())
    output.headers['Content-Disposition'] = 'attachment; filename=filtered_projects.csv'
    output.headers['Content-type'] = 'text/csv'
    return output

@app.route('/export_timesheet_all')
def export_timesheet_all():
    timesheets = Timesheet.query.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Project Name', 'Task Type', 'Task Name', 'Resource Name', 'Hours Worked', 'Date'])
    for t in timesheets:
        writer.writerow([t.id, t.project_name, t.task_type, t.task_name, t.resource_name, t.hours_worked, t.date])
    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode()), mimetype='text/csv', download_name='all_timesheet.csv', as_attachment=True)

@app.route('/export_timesheet_filtered')
def export_timesheet_filtered():
    project_name = request.args.get('project_name', '')
    resource_name = request.args.get('resource_name', '')
    task_type = request.args.get('task_type', '')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')

    query = Timesheet.query
    if project_name:
        query = query.filter_by(project_name=project_name)
    if resource_name:
        query = query.filter_by(resource_name=resource_name)
    if task_type:
        query = query.filter_by(task_type=task_type)
    if start_date:
        query = query.filter(Timesheet.date >= start_date)
    if end_date:
        query = query.filter(Timesheet.date <= end_date)

    results = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Project Name', 'Task Type', 'Task Name', 'Resource Name', 'Hours Worked', 'Date'])
    for t in results:
        writer.writerow([t.id, t.project_name, t.task_type, t.task_name, t.resource_name, t.hours_worked, t.date])
    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode()), mimetype='text/csv', download_name='filtered_timesheet.csv', as_attachment=True)



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000,debug=True)
