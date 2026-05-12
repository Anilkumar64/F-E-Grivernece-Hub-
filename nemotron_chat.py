import os
from openai import OpenAI

# Initialize client using NVIDIA's universal base URL
client = OpenAI(
  base_url = "nvidia.com",
  api_key = os.environ.get("NVIDIA_API_KEY", "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")
)

# Start a streaming completions query
completion = client.chat.completions.create(
  model="nvidia/nemotron-3-super-120b-a12b",
  messages=[{"role": "user", "content": "Write a clean Python function to find the longest common subsequence between two strings."}],
  temperature=1,
  top_p=0.95,
  max_tokens=16384,
  extra_body={
      "chat_template_kwargs": {"enable_thinking": True}, 
      "reasoning_budget": 8192
  },
  stream=True
)

print("--- [NVIDIA Nemotron Reasoning Trace] ---\n")
for chunk in completion:
  if not chunk.choices:
    continue
  
  delta = chunk.choices[0].delta
  
  # Fetch streaming reasoning/thinking tokens
  reasoning = getattr(delta, "reasoning", None) or getattr(delta, "reasoning_content", None)
  if reasoning:
    print(reasoning, end="", flush=True)
    
  # Fetch standard message response content tokens
  if delta.content is not None:
    print(delta.content, end="", flush=True)
