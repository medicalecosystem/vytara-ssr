from audio import speak
result = speak('test')
print(f"Result: {result}")
if result:
    print(f"Length: {len(result)}")
else:
    print("No audio generated")
