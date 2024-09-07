import os
import openai
from flask import Flask, request, jsonify

app = Flask(__name__)

# Set your OpenAI API key from environment variable
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route('/generate', methods=['POST'])
def generate_code():
    data = request.json
    prompt = data.get("prompt", "")

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        # Call OpenAI API to generate code based on the provided prompt
        response = openai.Completion.create(
            engine="text-davinci-003",  # Adjust the model if necessary
            prompt=prompt,
            max_tokens=1500,
            temperature=0.7
        )
        # Return generated code
        return jsonify({"generated_code": response.choices[0].text.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Run Flask app
    app.run(host="0.0.0.0", port=5000)
