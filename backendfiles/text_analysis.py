from openai import OpenAI

def analyze_food_item(food_item):
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key="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"
    )

    try:
        completion = client.chat.completions.create(
            model="nvidia/llama-3.1-nemotron-70b-instruct",
            messages=[{
                "role": "user",
                "content": f'Analyze the full nutritional information for the food item provided. List only the total values in a table-friendly format with columns as "Nutrient | Value" and format each entry as "Nutrient | Value", like "Calories | 400kcal". Use only "|" as a delimiter. All measurements should be in g, mg, mcg, or kcal, without daily value percentages (DV) or portion sizes. Provide every nutrient component as if the food is fully consumed. Include a confidence rating (1-10) on accuracy at the end. Use common names (e.g., vitamin B1) and exclude scientific names. \n\nHere\'s the food item:\n\n{food_item}'
            }],
            temperature=0.5,
            top_p=1,
            max_tokens=1024,
            stream=False
        )

        # Format response to match existing code's expected structure
        result = {
            "choices": [{
                "message": {
                    "content": completion.choices[0].message.content
                }
            }]
        }

        # Extract confidence rating from the model's response
        confidence_rating = extract_confidence(result)
        result['confidence'] = confidence_rating

        return result

    except Exception as e:
        print(f"Error in analyze_food_item: {str(e)}")
        return {"error": str(e)}
def extract_confidence(result):
    if 'confidence' in result:
        return result['confidence']
    return 0

