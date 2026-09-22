"""Response planning for grounded, concise ARIA answers."""


REFERENTIAL_MARKERS = (
    "what about that", "how about that", "what about it", "how about it",
    "how much is it", "and that one", "what about mine", "paano naman iyon",
    "paano naman ito", "magkano naman ito", "kumusta naman iyon",
    "unsa man", "unsa pud", "unsa sad", "unsa diay", "kumusta man",
    "kasano met", "ania met", "ania pay", "paano naman", "ano naman",
    "ano it", "hain man", "ano pa", "what about the",
)


class ResponseService:
    @staticmethod
    def ask_for_program(language_code: str) -> str:
        prompts = {
            "en": "Which program's curriculum do you mean—for example BSCS, BSMA, BSCrim, BEED, BSOA, or BSEd?",
            "fil": "Anong programa ang gusto mong tingnan—halimbawa, BSCS, BSMA, BSCrim, BEED, BSOA, o BSEd?",
            "ceb": "Unsang programa nga curriculum ang gusto nimong tan-awon—pananglitan, BSCS, BSMA, BSCrim, BEED, BSOA, o BSEd?",
            "ilo": "Ania a programa ti kayatmo a kitaen a curriculum—kas pagarigan, BSCS, BSMA, BSCrim, BEED, BSOA, wenno BSEd?",
            "hil": "Ano nga programa nga curriculum ang gusto mo makita—halimbawa, BSCS, BSMA, BSCrim, BEED, BSOA, ukon BSEd?",
            "war": "Ano nga programa nga curriculum an karuyag mo kitaon—pananglitan, BSCS, BSMA, BSCrim, BEED, BSOA, o BSEd?",
        }
        return prompts.get(language_code, prompts["en"])

    @staticmethod
    def clarify_filipino_bsed_year(language_code: str) -> str:
        prompts = {
            "en": "Which year of the BSEd Filipino curriculum do you mean—2024 or 2026? The verified course lists differ by year.",
            "fil": "Aling bersyon ng BSEd Filipino ang tinutukoy mo—2024 o 2026? Magkaiba ang verified na curriculum ng dalawang taon.",
            "ceb": "Unsang tuig nga bersyon sa BSEd Filipino ang imong pasabot—2024 o 2026? Lahi ang verified nga mga subject sa matag tuig.",
            "ilo": "Ania a tawen ti BSEd Filipino a kayatmo—2024 wenno 2026? Agduduma dagiti napasingkedan a kurso iti tunggal tawen.",
            "hil": "Alin nga tuig sang BSEd Filipino ang ginatumod mo—2024 ukon 2026? Lain ang verified nga mga subject sa kada tuig.",
            "war": "Hain nga tuig han BSEd Filipino an imo karuyag—2024 o 2026? Iba an napamatud-an nga mga subject ha kada tuig.",
        }
        return prompts.get(language_code, prompts["en"])

    @staticmethod
    def plan(query: str, intent: str, context_chunks: list[dict], history: list[dict], request_type: str | None = None) -> dict:
        lowered = (query or "").casefold()
        if not context_chunks:
            mode = "unavailable"
        elif intent == "curriculum_inquiry" and request_type == "full_list":
            mode = "curriculum_full_list"
        elif intent == "curriculum_inquiry":
            mode = "curriculum_summary" if request_type == "curriculum_question" else "simple_fact"
        elif any(marker in lowered for marker in REFERENTIAL_MARKERS) and history:
            mode = "follow_up"
        elif intent in {"grade_inquiry", "payment_inquiry"} and any(
            marker in lowered for marker in ("my ", "mine", "my grade", "my balance", "my payment")
        ):
            mode = "personal_record"
        elif any(marker in lowered for marker in (
            "how do i", "how can i", "how to", "steps", "process", "procedure", "paano",
            "unsaon", "giunsa", "kasano", "paonan-o", "paonan o", "panagaramid",
        )):
            mode = "procedure"
        elif len(context_chunks) <= 2:
            mode = "simple_fact"
        else:
            mode = "explanation"

        instructions = {
            "simple_fact": "Answer the exact question directly in one or two complete sentences. Include the relevant unit, date, or qualification from the source.",
            "personal_record": "Do not infer or invent a personal record. If a verified personal record is not supplied, explain that the student must use the signed-in portal service.",
            "procedure": "Give the verified steps in the order supported by the source. Do not add requirements or exceptions.",
            "curriculum_summary": "Answer only the requested curriculum detail. Preserve course codes, official titles, terms, and units from the named program source.",
            "curriculum_full_list": "Provide the complete verified list only when the user explicitly asks for it.",
            "explanation": "Explain the verified information in clear, natural language, using only the supplied institutional facts.",
            "follow_up": "Resolve the follow-up only when the conversation and supplied facts identify its subject. Otherwise ask one short clarification question.",
            "unavailable": "Say that no verified source is available and direct the student to the appropriate school office.",
        }
        return {"mode": mode, "instructions": instructions[mode], "request_type": request_type}


response_service = ResponseService()
