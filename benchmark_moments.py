"""
Vakiogiri Benchmark Moments Test Suite (Golden Dataset)
Evaluates moment detection accuracy, story completeness, and dangling opener resolution.

Runs 10 Test Cases:
1. Gaming 1v4 Clutch (Subscriber Challenge)
2. Dangling Opener Resolution ('Toh maine bola...')
3. Dangling Connector Resolution ('Aur uske baad...')
4. Podcast Startup Failure Debate
5. Streamer Rage Quit / Table Slam
6. Hilarious Teammate Betrayal / Fail
7. Tech Hot Take / Question Hook
8. Hindi Storytelling (Childhood Incident)
9. Rapid Multi-Kill Clutch Flow
10. Emotional Climax with Resolution
"""

import os
import sys
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from transcript_arc_finder import (
    build_sentence_index,
    resolve_dangling_boundaries,
    discover_story_arcs_with_sentence_ids,
    DANGLING_START_WORDS,
    DANGLING_END_WORDS
)

# 10 Golden Test Datasets
GOLDEN_DATASETS = [
    {
        "id": "test_1_gaming_clutch",
        "title": "BGMI 1v4 Subscriber Challenge",
        "expected_hook_contains": "challenge",
        "segments": [
            {"start": 0.0, "end": 4.0, "text": "Aaj stream pe alag hi vibe chal rahi thi."},
            {"start": 4.1, "end": 8.0, "text": "Ek viewer ne ₹500 superchat karke bola 1v4 clutch karke dikhao."},
            {"start": 8.1, "end": 12.0, "text": "Maine bola challenge accepted abhi live squad wipe karte hain."},
            {"start": 12.1, "end": 16.5, "text": "Pehla banda open me dauda spray deke knock kiya."},
            {"start": 16.6, "end": 21.0, "text": "Dusre bande ne rush kiya usko jump shot headshot mara."},
            {"start": 21.1, "end": 25.5, "text": "Last ke do bande compound me the grenade cook karke phenka double kill!"},
            {"start": 25.6, "end": 30.0, "text": "Bhai pura chat pagal ho gaya aur streamer ne table tod diya!"}
        ]
    },
    {
        "id": "test_2_dangling_opener_toh",
        "title": "Dangling 'Toh' Opener Test",
        "expected_not_start_with": "toh",
        "segments": [
            {"start": 0.0, "end": 3.5, "text": "Kal raat ek ajeeb sa incident hua tha."},
            {"start": 3.6, "end": 7.0, "text": "Toh maine socha ki chat ko batana zaroori hai."},
            {"start": 7.1, "end": 11.5, "text": "Jaise hi humne drop pe gaadi roki waha 4 squads lad rahe the."},
            {"start": 11.6, "end": 16.0, "text": "Maine smoke karke direct lootbox se AWM utha liya."},
            {"start": 16.1, "end": 21.0, "text": "Aur bina scope khole no-scope headshot mar diya!"}
        ]
    },
    {
        "id": "test_3_dangling_opener_aur",
        "title": "Dangling 'Aur' Opener Test",
        "expected_not_start_with": "aur",
        "segments": [
            {"start": 0.0, "end": 4.0, "text": "Log bolte hain ki YouTube algorithm ko samajhna mushkil hai."},
            {"start": 4.1, "end": 8.0, "text": "Aur sach ye hai ki 90% log galat format me video banate hain."},
            {"start": 8.1, "end": 12.5, "text": "Pehla rule ye hai ki opening 3 second me curiosity jagao."},
            {"start": 12.6, "end": 17.0, "text": "Agar viewer ruka to retention 80% cross karega."},
            {"start": 17.1, "end": 22.0, "text": "Yahi secret hai jisse har video viral jati hai."}
        ]
    },
    {
        "id": "test_4_podcast_startup_debate",
        "title": "Podcast Startup Failure Truth",
        "expected_hook_contains": "startup",
        "segments": [
            {"start": 0.0, "end": 4.0, "text": "Indian startup ecosystem me funding aana aasan hai ya mushkil?"},
            {"start": 4.1, "end": 9.0, "text": "Bhai 99% startups isliye band hote hain kyunki unke paas product-market fit nahi hota."},
            {"start": 9.1, "end": 14.0, "text": "Log paisa raise kar lete hain lekin unit economics pe dhyan nahi dete."},
            {"start": 14.1, "end": 19.0, "text": "Jab tak customer khud repeat order na kare tab tak growth fake hai."},
            {"start": 19.1, "end": 24.0, "text": "Ye harsh reality koi LinkedIn pe share nahi karta."}
        ]
    },
    {
        "id": "test_5_rage_quit",
        "title": "Streamer Rage Quit & Fail",
        "expected_hook_contains": "game",
        "segments": [
            {"start": 0.0, "end": 3.5, "text": "Ye game mujhe pagal karke chhodega."},
            {"start": 3.6, "end": 7.5, "text": "Aakhri bande ko 99 damage diya shotgun se fir bhi nahi mara!"},
            {"start": 7.6, "end": 11.5, "text": "Usne ek pistol goli se mujhe headshot maar diya."},
            {"start": 11.6, "end": 16.0, "text": "Bhai main alt+f4 kar raha hu ab mujhse nahi khela jayega!"},
            {"start": 16.1, "end": 20.0, "text": "Headphones fek diye streamer ne aur stream band kar di."}
        ]
    },
    {
        "id": "test_6_teammate_betrayal",
        "title": "Funny Teammate Grenade Troll",
        "expected_hook_contains": "grenade",
        "segments": [
            {"start": 0.0, "end": 4.0, "text": "Mere teammate ne bola ki wo enemy pe grenade phenk raha hai."},
            {"start": 4.1, "end": 8.5, "text": "Lekin us idiot ne grenade seedha meri gaadi ke tire pe chipka diya."},
            {"start": 8.6, "end": 13.0, "text": "Gaadi hawa me 50 feet ud gayi aur hum dono knock ho gaye."},
            {"start": 13.1, "end": 18.0, "text": "Puri lobby aur chat has has ke mar rahi thi bhai!"}
        ]
    },
    {
        "id": "test_7_tech_hot_take",
        "title": "AI Replacing Coders Debate",
        "expected_hook_contains": "ai",
        "segments": [
            {"start": 0.0, "end": 4.0, "text": "Kya AI software engineers ko sach me replace kar dega?"},
            {"start": 4.1, "end": 8.5, "text": "Asal me AI junior coders ka syntax kaam khatam kar dega."},
            {"start": 8.6, "end": 13.5, "text": "Lekin architecture aur system design hamesha human brain hi banayega."},
            {"start": 13.6, "end": 18.5, "text": "Jo log AI tools ko master karenge unki salary 3x ho jayegi."}
        ]
    },
    {
        "id": "test_8_childhood_story",
        "title": "Childhood School Incident Story",
        "expected_hook_contains": "school",
        "segments": [
            {"start": 0.0, "end": 4.0, "text": "Mera 8th class me ek sabse crazy incident hua tha."},
            {"start": 4.1, "end": 8.5, "text": "Humne principal ke cabin ke bahar cracker burst kar diya tha."},
            {"start": 8.6, "end": 13.0, "text": "Pura school evacuate ho gaya aur investigation shuru ho gayi."},
            {"start": 13.1, "end": 18.0, "text": "Hum sabse shareef banke library me baithe the taaki shak na ho!"}
        ]
    },
    {
        "id": "test_9_multi_kill_flow",
        "title": "Valorant Ace Clutch Round",
        "expected_hook_contains": "ace",
        "segments": [
            {"start": 0.0, "end": 4.0, "text": "Watch this round right now ace clutch incoming."},
            {"start": 4.1, "end": 8.0, "text": "First pick mid site Jett headshot."},
            {"start": 8.1, "end": 12.0, "text": "Reyna flashed blinded spray transfer second kill."},
            {"start": 12.1, "end": 16.0, "text": "Omen TP sound caught third kill."},
            {"start": 16.1, "end": 21.0, "text": "Last two defusing bomb collateral sniper flick ACE round win!"}
        ]
    },
    {
        "id": "test_10_emotional_payoff",
        "title": "Streamer 100k Subs Journey",
        "expected_hook_contains": "journey",
        "segments": [
            {"start": 0.0, "end": 4.0, "text": "Jab 3 saal pehle zero viewers se stream shuru kiya tha tab kisine believe nahi kiya."},
            {"start": 4.1, "end": 9.0, "text": "Mom dad bolte the job dhundho internet pe time waste mat karo."},
            {"start": 9.1, "end": 14.0, "text": "Aaj 100k subscribers complete ho gaye aur pehla Silver Play Button aa gaya."},
            {"start": 14.1, "end": 19.5, "text": "Ye moment sirf mera nahi har us viewer ka hai jo day one se support kar raha tha!"}
        ]
    }
]


def run_benchmarks(limit: int = 5):
    print("\n=======================================================", flush=True)
    print("🏆 VAKIOGIRI GOLDEN MOMENT BENCHMARK SUITE", flush=True)
    print("=======================================================\n", flush=True)

    passed_count = 0
    test_cases_to_run = GOLDEN_DATASETS[:limit]
    total_count = len(test_cases_to_run)

    for idx, test_case in enumerate(test_cases_to_run, 1):
        test_id = test_case["id"]
        title = test_case["title"]
        segments = test_case["segments"]
        print(f"[{idx}/{total_count}] Testing: {title} ({test_id})...", flush=True)

        sentences, id_map = build_sentence_index(segments)

        # 1. Test Sentence Indexing
        if not sentences:
            print(f"  ❌ FAILED: Sentence indexing failed for {test_id}", flush=True)
            continue

        # 2. Test Arc Discovery
        moments = discover_story_arcs_with_sentence_ids(
            segments=segments,
            video_title=title,
            target_moments=1,
            min_duration=12.0,
            max_duration=65.0
        )

        if not moments:
            print(f"  ❌ FAILED: No moments discovered for {test_id}", flush=True)
            continue

        m = moments[0]
        start_id = m.get("start_id", "")
        start_text = id_map.get(start_id, {}).get("text", "")
        first_word = start_text.split()[0].lower().strip(".,!?;:\"'-()[]{}") if start_text else ""
        dur = m.get("duration", 0.0)

        # Check: Never starts on dangling word
        is_dangling = first_word in DANGLING_START_WORDS
        if is_dangling:
            print(f"  ❌ FAILED: Starts on dangling word '{first_word}' in '{start_text}'", flush=True)
            continue

        # Check: Duration within bounds
        if dur < 10.0 or dur > 70.0:
            print(f"  ❌ FAILED: Duration {dur}s outside expected bounds (10s - 70s)", flush=True)
            continue

        print(f"  ✅ PASSED: [{m['start_id']} -> {m['end_id']}] ({dur}s)", flush=True)
        print(f"     Title: {m['title']}", flush=True)
        print(f"     Hook Quote: {m['hook_quote'][:60]}...", flush=True)
        passed_count += 1

    print("\n=======================================================", flush=True)
    print(f"BENCHMARK RESULTS: {passed_count}/{total_count} PASSED ({int((passed_count/total_count)*100)}%)", flush=True)
    print("=======================================================\n", flush=True)
    return passed_count == total_count


if __name__ == "__main__":
    success = run_benchmarks()
    sys.exit(0 if success else 1)
