import sys
import os
from flask import Flask, request, jsonify, redirect, url_for, session, render_template
from flask_cors import CORS
from flask_dance.contrib.google import make_google_blueprint, google

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from image_analysis import analyze_image
from text_analysis import analyze_food_item
from edit_analysis import analyze_image_with_food_item
from rec_analysis import generate_recommendations

app = Flask(__name__, template_folder='/Users/aiftekhar/Desktop/nutri/frontend')  # Specify the frontend folder for templates
app.secret_key = 'nutrisecretkeyrandom79800'  # Change this to a random secret key
CORS(app)

# Set up Google OAuth
google_bp = make_google_blueprint(client_id='YOUR_GOOGLE_CLIENT_ID', client_secret='YOUR_GOOGLE_CLIENT_SECRET', redirect_to='google_login')
app.register_blueprint(google_bp, url_prefix='/google_login')

@app.route('/')
def home():
    print("Home route accessed")
    return render_template('index.html')  # Serve index.html from the frontend folder

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image = request.files['image']
    image_path = 'uploaded_image.png'
    image.save(image_path)

    result = analyze_image(image_path)
    print('Analysis result:', result)  # Log the result for debugging

    if 'error' in result:
        return jsonify({'error': result['error']}), 400

    return jsonify(result)

@app.route('/edit', methods=['POST'])
def edit():
    data = request.get_json()
    if not data or 'foodItem' not in data:
        return jsonify({"error": "No food item provided."}), 400

    food_item = data['foodItem']
    result = analyze_image_with_food_item(food_item)

    return jsonify(result)

@app.route('/login')
def login():
    return redirect(url_for('google.login'))

@app.route('/auth/google/callback')
def google_login():
    if not google.authorized:
        return redirect(url_for('login'))
    resp = google.get('/plus/v1/people/me')
    if not resp.ok:
        return f"Failed to fetch user info: {resp.text}"
    
    user_data = resp.json()
    return render_template('profile.html', user=user_data)

@app.route('/about')
def about():
    return render_template('about.html')  # Serve about.html from the frontend folder

@app.route('/analyze-text', methods=['POST'])
def analyze_text():
    # Logic to process the food item
    data = request.get_json()
    food_item = data.get('foodItem')
    
    # Call the analysis function (e.g., analyze_food_item)
    result = analyze_food_item(food_item)
    
    return jsonify(result)

@app.route('/generate_recommendations', methods=['POST'])
def generate_recommendations_route():
    data = request.get_json()
    if not data or 'report_data' not in data:
        return jsonify({"error": "No report data provided."}), 400

    report_data = data['report_data']
    result = generate_recommendations(report_data)
    
    return jsonify(result)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))  # Use the PORT environment variable
    app.run(host='0.0.0.0', port=port, debug=True)  # Bind to all interfaces
