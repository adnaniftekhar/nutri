import requests
import base64

def analyze_image_with_food_item(food_item):
    invoke_url = "https://ai.api.nvidia.com/v1/gr/meta/llama-3.2-90b-vision-instruct/chat/completions"
    stream = False

    headers = {
        "Authorization": "Bearer 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",
        "Accept": "text/event-stream" if stream else "application/json"
    }

    payload = {
        "model": 'meta/llama-3.2-90b-vision-instruct',
        "messages": [
            {
                "role": "user",
                "content": f'Analyze the FULL nutritional information for the food item including calories, protein, fats, fiber and more "{food_item}". Parse the information on the food as simply as possible. Reduce it to its simplest components (eg. if it is one banana, then just give the information based on one banana only. If it is a plate of food, break it down into the components you recognize and parse that information). Format the nutritional information in a table-friendly structure with the following columns: Nutrient and Value. Provide the values in this format: "Fiber: 5g", "Vitamin D: 1mg", "Calories: 400kcal etc. ALWAYS use the | delimiter to separate the nutrient and value. Ensure that the amounts are given in g or mg for macronutrients and micronutrients instead of daily values (DV). Include a FULL and detailed breakdown of the observed food. Assume that the food is shown in the picture is being consumed in its enitrety and do not include any portion sizes. Additionally, provide a confidence rating from 1-10 on the accuracy of this analysis." />'

            }
        ],
        "max_tokens": 512,
        "temperature": 1.00,
        "top_p": 1.00,
        "stream": stream
    }

    response = requests.post(invoke_url, headers=headers, json=payload)
    result = response.json()

    # Extract confidence rating from the model's response
    confidence_rating = extract_confidence(result)  # Call the function to get the confidence
    result['confidence'] = confidence_rating  # Add confidence rating to the result

    return result

def extract_confidence(result):
    # Example logic to extract confidence from the model's response
    if 'confidence' in result:
        return result['confidence']  # Return the confidence score if available

    return 0  # Default value if no confidence score is found
