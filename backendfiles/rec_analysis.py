from openai import OpenAI

def generate_recommendations(report_data):
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key="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"
    )

    prompt = (
        "Analyze the complete nutritional information for the day below. "
        "Provide a summary that includes:\n\n"
        "1. A concise overview of the key nutrients consumed, highlighting any that are significantly above or below the recommended daily values (DV).\n"
        "2. Specific recommendations to either increase or decrease the intake of these nutrients, based on the DV for a healthy adult.\n\n"
        "Please structure your response as follows:\n\n"
        "- **Summary**: A brief summary (2-3 sentences) that provides a general overview of the nutritional balance for the day.\n"
        "- **Detailed Recommendations**: A more detailed explanation outlining which nutrients need adjustment, why they are important, and specific suggestions on how to improve overall nutrition. Please ensure the language is friendly and supportive, suitable for someone seeking actionable advice."
    )

    try:
        completion = client.chat.completions.create(
            model="nvidia/llama-3.1-nemotron-70b-instruct",
            messages=[{
                "role": "user",
                "content": f"{prompt}\n\nHere is the daily nutritional report:\n\n{report_data}"
            }],
            temperature=0.5,
            top_p=1,
            max_tokens=1024,
            stream=False
        )

        # Format response to match existing code's expected structure
        result = {
            "recommendations": completion.choices[0].message.content
        }

        return result

    except Exception as e:
        print(f"Error in generate_recommendations: {str(e)}")
        return {"recommendations": "Error generating recommendations. Please try again."}
