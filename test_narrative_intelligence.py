from moment_detector import (
    is_true_sentence_starter,
    is_clean_sentence_ender,
    trace_narrative_context_for_peak,
    snap_to_sentence_boundaries,
    score_transcript_hook_and_story
)

# Simulated transcript with awkward speech pauses and mid-sentence breaks
dummy_segments = [
    {"start": 0.0, "end": 4.2, "text": "So basically yesterday I was thinking,"},
    {"start": 4.5, "end": 8.1, "text": "and I realized that most people make this huge mistake."},
    {"start": 8.5, "end": 13.0, "text": "Why do so many creators fail on YouTube?"}, # <--- Major hook question
    {"start": 13.4, "end": 18.2, "text": "The secret is that they ignore viewer retention in the first three seconds."},
    {"start": 18.5, "end": 22.0, "text": "And that is why you should always start with a punchline!"}, # <--- Climax / Peak (around 20s)
    {"start": 22.5, "end": 26.0, "text": "Because if you don't do that,"}, # <--- Dangling trailing sentence
    {"start": 26.2, "end": 30.0, "text": "then nobody stays until the end."}
]

print("1. Testing Sentence Starters & Enders:")
print("  - 'Why do so many...':", is_true_sentence_starter(dummy_segments[2], dummy_segments[1]))
print("  - 'And that is why...':", is_clean_sentence_ender(dummy_segments[4]))
print("  - 'Because if you don't do that,':", is_clean_sentence_ender(dummy_segments[5]))

# Test Backward Narrative Tracing from peak at 20.0s
start_time, end_time = trace_narrative_context_for_peak(
    peak_time=20.0,
    segments=dummy_segments,
    total_duration=35.0,
    target_duration=15.0
)
print(f"\n2. Narrative Context Window for Peak at 20.0s:")
print(f"   Traced Start: {start_time}s | Traced End: {end_time}s")

# Extract the captured text
captured_text = " ".join([s["text"] for s in dummy_segments if not (s["end"] < start_time or s["start"] > end_time)])
print(f"   Captured Story:\n   \"{captured_text}\"")

# Score the captured story
score, title = score_transcript_hook_and_story(
    text_slice=captured_text,
    opener_slice=" ".join(captured_text.split()[:5]),
    word_count=len(captured_text.split()),
    duration=end_time - start_time
)
print(f"\n3. Story Quality Score: {score}/100 | Smart Title: '{title}'")

assert score >= 75.0, "Expected high viral score for question hook + punchline"
assert "Because if you don't do that," not in captured_text or "then nobody stays until the end." in captured_text, "No dangling endings allowed!"
print("\n[SUCCESS] Open-source narrative intelligence passed all checks!")
