from flask import Flask, request, jsonify
from flask_cors import CORS
from llm import get_reply

app = Flask(__name__)

# CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://vytara-official.vercel.app",
            "https://*.vercel.app"
        ],
        "methods": ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'success': False, 'reply': 'No message provided'}), 400

        message = data['message']
        reply = get_reply(message)

        return jsonify({'success': True, 'reply': reply}), 200
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({'success': False, 'reply': 'Unable to process request'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
