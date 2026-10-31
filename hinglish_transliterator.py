# -*- coding: utf-8 -*-
"""
Hinglish Transliterator & Language Formatter for Vakiogiri Gaming Shorts
Converts Devanagari Hindi text to clean, natural Roman Hinglish (Bollywood/YouTube Shorts style)
while keeping English gaming jargon (kill, revive, headshot, Arthur, jump, etc.) intact.
"""

import re
from typing import Dict, Any, List

# Common Indian gaming & conversational words dictionary for 100% natural colloquial spelling
COMMON_HINGLISH_MAP = {
    # Pronouns & Questions
    "क्या": "kya", "क्यों": "kyun", "कहाँ": "kahan", "कहा": "kaha", "यहाँ": "yahan", "वहाँ": "wahan", 
    "कैसे": "kaise", "कब": "kab", "कौन": "kaun", "किसका": "kiska", "किसने": "kisne", "किसे": "kise",
    "ये": "ye", "यह": "yeh", "वो": "wo", "वह": "woh", "इस": "is", "उस": "us", "इन": "in", "उन": "un",
    "मेरा": "mera", "मेरी": "meri", "मेरे": "mere", "तेरा": "tera", "तेरी": "teri", "तेरे": "tere",
    "तुम्हारा": "tumhara", "तुम्हारी": "tumhari", "तुम्हारे": "tumhare", "हमारा": "hamara",
    "तू": "tu", "तुम": "tum", "आप": "aap", "हम": "hum", "मैं": "main", "मुझे": "mujhe", "तुझे": "tujhe",
    "उसको": "usko", "इसको": "isko", "किसको": "kisko", "सब": "sab", "सबको": "sabko", "खुद": "khud",
    
    # Common Gaming Expressions & Exclamations
    "अरे": "arre", "भाई": "bhai", "यार": "yaar", "ओह": "oh", "अच्छा": "achha", "हाँ": "haan", "ना": "na",
    "नहीं": "nahi", "नही": "nahi", "मत": "mat", "ओय": "oye", "अबे": "abe", "अरेरे": "arere",
    "शाबाश": "shabash", "वाह": "wah", "मज़ा": "maza", "मजा": "maza", "दोस्त": "dost", "बाप": "baap",
    "खत्म": "khatam", "खलास": "khalas", "गया": "gaya", "गई": "gayi", "गए": "gaye", "टाटा": "tata",
    "बाय": "bye", "बायबाय": "bye bye", "बेटा": "beta", "भगवान": "bhagwan", "हे": "hey",
    "ओपी": "op", "ब्रो": "bro", "माय": "my", "गॉड": "god",
    "तो": "to", "बस": "bas", "लाडले": "ladle", "साहब": "sahab", "सर": "sir", "लिटरेली": "literally",
    
    # Verbs (Doing, Seeing, Moving, Shooting, Gaming)
    "कर": "kar", "रहा": "raha", "रही": "rahi", "रहे": "rahe", "रहुंगा": "rahunga", "रहूंगा": "rahunga",
    "करो": "karo", "करना": "karna", "किया": "kiya", "की": "ki", "का": "ka", "के": "ke", "को": "ko",
    "है": "hai", "हैं": "hain", "हो": "ho", "हूँ": "hoon", "हूं": "hoon", "था": "tha", "थी": "thee", "थे": "the",
    "होगा": "hoga", "होगी": "hogi", "होंगे": "honge", "होने": "hone", "हुआ": "hua", "हुई": "hui", "हुए": "hue",
    "देख": "dekh", "देखो": "dekho", "देखा": "dekha", "दिखा": "dikha", "दिखाया": "dikhaya",
    "बोल": "bol", "बोला": "bola", "बोलो": "bolo", "बोलना": "bolna",
    "जा": "ja", "जाओ": "jao", "जाना": "jana", "जाए": "jaaye", "जाएगा": "jaayega", "जाएगी": "jaayegi",
    "आ": "aa", "आओ": "aao", "आना": "aana", "आया": "aaya", "आयी": "aayi", "आएगा": "aayega",
    "मार": "maar", "मारो": "maro", "मारा": "mara", "मारेगा": "marega", "मारना": "marna",
    "चल": "chal", "चलो": "chalo", "चला": "chala", "चलाओ": "chalao", "चलना": "chalna",
    "रुक": "ruk", "रुको": "ruko", "रुका": "ruka", "रुकना": "rukna", "ठहर": "thahar",
    "बच": "bach", "बचा": "bacha", "बचाओ": "bachao", "बचना": "bachna", "बचके": "bachke",
    "पकड़": "pakad", "पकड़ो": "pakdo", "छोड़": "chhod", "छोड़ो": "chhodo",
    "भाग": "bhag", "भागो": "bhago", "भागजा": "bhagja", "भग": "bhag", "भगजा": "bhagja", "दौड़": "daud", "दौड़ो": "daudo",
    "लगा": "laga", "लगे": "lage", "लगी": "lagi", "लगेगा": "lagega", "चढ़": "chadh", "चढ़ा": "chadha",
    "निकल": "nikal", "निकला": "nikla", "निकले": "nikle", "निकलना": "nikalna",
    "जीत": "jeet", "जीता": "jeeta", "हार": "haar", "हारा": "haara",
    "पाऊंगा": "paunga", "पाएगा": "paayega", "पाएंगे": "paayenge", "सकता": "sakta", "सकती": "sakti", "सकते": "sakte",
    "गिर": "gir", "गिरा": "gira", "गिरे": "gire", "कूद": "kood", "कूदो": "koodo",
    
    # Common Loanwords & Gaming Slang in Devanagari
    "जम्प": "jump", "जंप": "jump", "एंगल": "angle", "संगल": "angle", "गेम": "game", "गेम्स": "games",
    "किल": "kill", "हेडशॉट": "headshot", "प्लेयर": "player", "लाइव": "live", "स्ट्रीम": "stream",
    "सर्फेस": "surface", "सरफेस": "surface", "सर्पेस": "surface", "सर्फस": "surface", "जाहब": "sahab", "ओरी": "oye", "वाटर": "water", "लोड": "load", "स्टार्ट": "start",
    "सर्कल": "circle", "सर्कल्स": "circles", "संकल्स": "circles", "संकलस": "circles",
    "क्योंकि": "kyunki", "क्युकी": "kyunki", "क्योकि": "kyunki", "मुकाबले": "mukable", "मुकामले": "mukable",
    "चटनी": "chat", "चट": "chat",
    "भागे": "bhage", "भागी": "bhagi", "bhaagi": "bhagi",
    "लोगों": "logon", "लोग": "log", "एंड": "end", "पाऊँगा": "paunga",
    "स्टॉप": "stop", "लेवल": "level", "सर्वर": "server", "रूम": "room", "बैकरूम्स": "backrooms",
    "इम्पॉसिबल": "impossible", "पॉसिबल": "possible", "पानी": "paani", "में": "mein", "से": "se",
    "तक": "tak", "पर": "par", "पे": "pe", "बंदा": "banda", "बंदे": "bande", "एनिमी": "enemy",
    "टीम": "team", "लूट": "loot", "गन": "gun", "शॉट": "shot", "स्नाइपर": "sniper", "डैमेज": "damage",
    
    # Adjectives & Modifiers
    "बहुत": "bahut", "जल्दी": "jaldi", "थोड़ा": "thoda", "थोड़ी": "thodi", "ज़्यादा": "zyada", "ज्यादा": "zyada",
    "कम": "kam", "तेज़": "tez", "तेज": "tez", "धीमे": "dheeme", "पहले": "pehle", "बाद": "baad",
    "आगे": "aage", "पीछे": "peeche", "ऊपर": "upar", "नीचे": "neeche", "अंदर": "andar", "बाहर": "bahar",
    "साथ": "saath", "पास": "paas", "दूर": "door", "सीधा": "seedha", "उल्टा": "ulta",
    "सही": "sahi", "गलत": "galat", "सच": "sach", "झूठ": "jhooth", "असली": "asli",
    "पहला": "pehla", "दूसरा": "doosra", "तीसरा": "teesra", "आखिरी": "aakhiri",
    "बड़ा": "bada", "बड़ी": "badi", "बड़े": "bade", "छोटा": "chhota",
    "काफी": "kafi", "वाला": "wala", "वाली": "wali", "वाले": "wale",
    
    # Numbers
    "एक": "ek", "दो": "do", "तीन": "teen", "चार": "chaar", "पाँच": "paanch", "पांच": "paanch",
    "छह": "chheh", "सात": "saat", "आठ": "aath", "नौ": "nau", "दस": "das"
}

# Phonetic character mappings
VOWELS = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
    'ऑ': 'o', 'ऍ': 'e'
}

MATRAS = {
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    'ं': 'n', 'ँ': 'n', 'ः': 'h', '़': '',
    'ॉ': 'o', 'ॅ': 'e', '्': ''
}

CONSONANTS = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h',
    'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'फ़': 'f', 'ड़': 'r', 'ढ़': 'rh'
}


def is_devanagari(text: str) -> bool:
    """Check if string contains any Devanagari Unicode characters."""
    return any('\u0900' <= c <= '\u097F' for c in text)


def transliterate_word(word: str) -> str:
    """Transliterates a single Hindi word into natural Roman Hinglish."""
    word = clean_foreign_unicode(word)
    if not is_devanagari(word):
        return word

    # Separate punctuation
    clean_w = word.strip('.,!?;:\"\'()[]{}')
    if not clean_w:
        return word

    pre_punct = ""
    for c in word:
        if c in '.,!?;:\"\'([{':
            pre_punct += c
        else:
            break

    post_punct = ""
    for c in reversed(word):
        if c in '.,!?;:\"\'\')]}':
            post_punct = c + post_punct
        else:
            break

    # 1. Check common colloquial dictionary first
    if clean_w in COMMON_HINGLISH_MAP:
        return pre_punct + COMMON_HINGLISH_MAP[clean_w] + post_punct

    # 2. Rule-based phonetic transliteration with Hindi schwa deletion
    res: List[str] = []
    n = len(clean_w)
    idx = 0

    while idx < n:
        # Check nukta consonants (2 chars)
        if idx + 1 < n and clean_w[idx:idx+2] in CONSONANTS:
            res.append(CONSONANTS[clean_w[idx:idx+2]])
            idx += 2
            continue

        ch = clean_w[idx]
        if ch in VOWELS:
            res.append(VOWELS[ch])
        elif ch in CONSONANTS:
            res.append(CONSONANTS[ch])
            # Check for halant (्) or matra
            if idx + 1 < n:
                next_ch = clean_w[idx + 1]
                if next_ch == '्':  # Halant suppresses inherent 'a'
                    idx += 1
                elif next_ch in MATRAS:
                    res.append(MATRAS[next_ch])
                    idx += 1
                else:
                    # Inherent 'a' if not at the very end of the word
                    if idx + 1 < n - 1:
                        res.append('a')
            else:
                # Word-terminal consonant in Hindi: schwa is silent
                pass
        elif ch in MATRAS:
            res.append(MATRAS[ch])
        else:
            res.append(ch)

        idx += 1

    transliterated = "".join(res)
    return pre_punct + transliterated + post_punct


def clean_foreign_unicode(text: str) -> str:
    """Removes any characters outside basic Latin ASCII, Devanagari, digits, and punctuation."""
    if not text:
        return ""
    # Filter out Cyrillic, Korean, Thai, Hebrew, etc.
    cleaned = re.sub(r'[^\x20-\x7E\u0900-\u097F]', '', text)
    # Collapse duplicate whitespace
    return re.sub(r'\s+', ' ', cleaned).strip()


def to_hinglish_sentence(text: str) -> str:
    """Converts a Hindi or mixed sentence into clean Roman Hinglish."""
    if not text:
        return ""
    sanitized = clean_foreign_unicode(text)
    if not is_devanagari(sanitized):
        return sanitized

    tokens = sanitized.split()
    converted_tokens = [transliterate_word(tok) for tok in tokens]
    return clean_foreign_unicode(" ".join(converted_tokens))
