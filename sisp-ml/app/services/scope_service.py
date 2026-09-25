import re


ACADEMIC_TERMS = {
    "academic", "adviser", "advisor", "balance", "cashier", "class", "course", "curriculum",
    "diploma", "document", "enroll", "enrollment", "enrolment", "exam", "finals", "grade", "graduation",
    "midterm", "permit", "prelim", "prerequisite", "registrar", "request", "schedule", "semester",
    "student", "subject", "transcript", "treasury", "tuition", "matriculation", "akademiko", "bayad", "bayranan",
    "dokumento", "grado", "iskedyul", "klase", "kurso", "mag enroll", "matrikula", "paaralan",
    "pagsusulit", "permiso", "subject ko", "enrolment", "eskwela", "iskwela", "pag enroll", "pasulit",
    "grades", "enrollment_status", "document_request_status", "dean", "faculty", "teacher",
    "official", "officials", "advice", "advising", "advisory", "policy", "policies", "handbook",
    "program", "programs", "programme", "programmes", "degree", "degrees",
    "school hours", "academic calendar", "requirements", "student services", "office", "publication",
    "guro", "titser", "tagapayo", "opisina", "patakaran", "payong", "payo",
    "eskuelaan", "eskwelahan", "pangutana", "pamangkot", "pakiana", "saludsod",
    "iskediul", "iskedyul", "bayad", "matrikula", "grado", "kurso", "dokumento",
}

# Common question forms should route to the verified academic corpus even when
# they omit formal keywords such as "enrollment" or "document request".
ACADEMIC_PHRASES = (
    "how do i enroll", "how can i enroll", "how to enroll", "how do i apply",
    "how can i apply", "paano mag enroll", "paano mag-enroll",
    "unsaon pag enroll", "unsaon pag-enroll", "kasano ti ag-enroll",
    "how much is a tor", "how much is the tor", "tor fee", "document fee", "document fees",
    "request a tor", "request transcript", "curriculum for", "courses in",
    "pila ang tor", "pila sang tor", "pila sa tor", "pira an tor", "tagpira an tor", "mano ti tor",
    "pila ang matrikula", "pila sang matrikula", "pila sa matrikula", "pira an matrikula", "mano ti matrikula",
)

DOCUMENT_FEE_TERMS = (
    "good moral", "moral certificate", "2nd copy of grades", "second copy of grades",
    "2nd copy", "second copy", "grades copy", "copy of grades", "certified true copy",
    "certificate of registration", "certificate of enrollment",
    "transcript of records", "transcript", "document request", "document requests",
    "request fees",
    "cor", "tor", "coe",
)
DOCUMENT_FEE_CUES = (
    "fee", "fees", "how much", "cost", "costs", "price", "prices", "total", "altogether", "combined amount", "magkano", "bayad", "presyo",
    "tagpira", "tagpila", "pila", "mano",
)

# These cues are covered by the owner-supplied ARIA student-services FAQ.
# Keep this list specific so arbitrary non-school payment, travel, or calendar
# questions do not become in-scope by accident.
STUDENT_SERVICE_PHRASES = (
    "student record update", "student record updates", "student records update",
    "updating student records", "portal and paper records", "paper records and portal",
    "records office responsibilities", "records office services",
    "payment", "online payment", "payment method", "payment methods", "proof of payment",
    "payment option", "payment options", "payment process", "pay online",
    "bank transfer", "gcash", "pnb", "add/drop", "add drop", "adding a subject",
    "dropping a subject", "changing subjects", "subject change", "inc", "special exam",
    "special examination", "orientation", "orientations", "orientasyon", "oryentasyon", "oriyentasyon",
    "classes start", "class start", "grade release", "grades release", "school address",
    "school's address", "contact number", "general email", "academic department email",
    "classes scheduled to start", "when do classes start", "when were classes scheduled",
    "class start date", "school address in the memo", "address in the official memorandum",
    "address in official memoranda", "address shown in the memorandum", "school location",
    "address appears in the official", "address in the official 2026 school memoranda",
    "where to pay", "where do i pay", "where can i pay", "where should i pay",
    "how to pay", "how do i pay", "how can i pay", "how should i pay",
    "saan magbayad", "saan ako magbabayad", "saan ko babayaran", "paano magbayad",
    "paano ako magbayad", "asa mobayad", "asa ko mobayad", "unsaon pagbayad",
    "diin magbayad", "diin ti agbayad", "sadino ti agbayad", "hain magbayad",
    "hain ako magbayad",
)

# A personal marker such as "my" or "ako" should not turn an informational
# payment question into a private balance lookup. Explicit amount/balance
# questions still use the authenticated database route below.
PAYMENT_INSTRUCTION_PHRASES = (
    "where to pay", "where do i pay", "where can i pay", "where should i pay",
    "how to pay", "how do i pay", "how can i pay", "how should i pay",
    "pay online", "payment method", "payment methods", "payment option", "payment options",
    "online payment", "payment process", "proof of payment", "bank transfer", "gcash", "pnb",
    "saan magbayad", "saan ako magbabayad", "saan ko babayaran", "paano magbayad",
    "paano ako magbayad", "asa mobayad", "asa ko mobayad", "unsaon pagbayad",
    "diin magbayad", "diin ti agbayad", "sadino ti agbayad", "hain magbayad",
    "hain ako magbayad", "magbayad", "magbabayad", "mobayad", "makakabayad",
    "agbayad", "pagbayad",
)

CONTINUING_ENROLLMENT_PHRASES = (
    "continuing student", "continuing students", "continue my studies",
    "continuing studies", "magpatuloy", "magpapatuloy", "magpadayon",
    "magpapadayon", "magapadayon", "agtultuloy",
    "returning after a break", "returning after time away", "return to school",
    "mobalik human mohunong", "mobalik human mohunong sa pag eskwela",
    "mobalik sa eskwela", "ag subli kalpasan", "agsubli kalpasan",
    "nagabalik pagkatapos sang pag untat", "mabalik pagkatapos sang pag untat",
    "mabalik katapos umundang", "mabalik ha eskwelahan",
)

SUBJECT_CHANGE_PHRASES = (
    "add/drop", "add drop", "adding a subject", "dropping a subject",
    "adding or changing subjects", "changing subjects", "subject change",
    "change of subject", "change a subject", "add a subject", "drop a subject",
    "add or drop", "add, drop", "add drop change", "schedule change",
)

POLICY_RECORD_COLLISION_PHRASES = (
    "grade appeal", "grade appeals", "appeal deadline", "appeal policy",
    "passing grade", "grading policy", "grade policy", "grade scale",
    "academic probation", "current verified rule", "institutional rule",
    "change a grade", "change my grade", "change grades", "update my grade",
    "correct my grade", "edit my grade", "modify my grade", "change a grade in my record",
    "paying the down-payment", "paying the down payment", "paying the downpayment",
    "payment proves enrollment", "prove my enrollment status", "down-payment by itself",
)

OUT_OF_SCOPE_TERMS = {
    "recipe", "celebrity", "politics", "weather", "movie", "write code", "game cheat", "sports score",
    "stock price", "crypto", "write my essay", "dating", "medical diagnosis", "relationship advice",
    "religion", "horoscope", "lottery", "shopping recommendation", "travel itinerary", "legal advice",
}

PERSONAL_MARKERS = {
    "ko", "ako", "mine", "akong", "siak", "current", "akin", "my", "akon", "i owe",
}
PERSONAL_ROUTES = {
    "grades": {"grades", "grado", "grade", "marka"},
    "schedule": {
        "class schedule", "schedule", "oras ng klase", "iskedyul", "my subjects", "my subject",
        "my courses", "my classes", "subjects ko", "subject ko", "courses ko", "mga subject ko",
        "mga kurso ko", "subjects nako", "akong mga subject", "akong kurso", "akong mga kurso",
        "subject ko ha", "subjects ko ha", "mga subject ko ha", "class list ko",
    },
    "balance": {
        "account balance", "balance", "bayranan", "matrikula", "tuition",
        "owe", "amount due", "outstanding amount", "how much do i owe",
    },
    "enrollment_status": {"enrolled", "naka enroll", "nakapag enroll", "enrollment status"},
    "document_request_status": {"document request status", "status ng request", "request status"},
}


class ScopeService:
    @staticmethod
    def _contains_phrase(text: str, phrase: str) -> bool:
        pattern = r"[\s-]+".join(re.escape(part) for part in phrase.casefold().split())
        return bool(re.search(rf"(?<!\w){pattern}(?!\w)", text))

    @staticmethod
    def is_student_services_faq_query(query: str) -> bool:
        normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()
        return any(
            ScopeService._contains_phrase(normalized, phrase)
            for phrase in STUDENT_SERVICE_PHRASES
        )

    @staticmethod
    def is_payment_instruction_query(query: str) -> bool:
        normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()
        return any(
            ScopeService._contains_phrase(normalized, phrase)
            for phrase in PAYMENT_INSTRUCTION_PHRASES
        )

    @staticmethod
    def is_subject_change_query(query: str) -> bool:
        normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()
        return any(
            ScopeService._contains_phrase(normalized, phrase)
            for phrase in SUBJECT_CHANGE_PHRASES
        )

    @staticmethod
    def route(query: str) -> dict:
        normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()

        if ScopeService.is_payment_instruction_query(normalized):
            return {"route": "policy", "action": None, "inScope": True}
        if any(
            ScopeService._contains_phrase(normalized, phrase)
            for phrase in CONTINUING_ENROLLMENT_PHRASES
        ):
            return {"route": "policy", "action": None, "inScope": True}

        asks_policy_about_personal_topic = any(
            ScopeService._contains_phrase(normalized, phrase)
            for phrase in POLICY_RECORD_COLLISION_PHRASES
        )

        # Explicit document-fee questions must win over a personal-record cue.
        # Phrases such as "the fee for a certified true copy of my grades"
        # mention "my grades", but ask about the public fee schedule, not the
        # student's private grade record.
        asks_document_fee = (
            any(ScopeService._contains_phrase(normalized, cue) for cue in DOCUMENT_FEE_CUES)
            and any(ScopeService._contains_phrase(normalized, term) for term in DOCUMENT_FEE_TERMS)
        )
        if asks_document_fee:
            return {"route": "policy", "action": None, "inScope": True}

        is_personal = not asks_policy_about_personal_topic and any(
            ScopeService._contains_phrase(normalized, marker)
            for marker in PERSONAL_MARKERS
        )
        if is_personal:
            for action, terms in PERSONAL_ROUTES.items():
                if any(ScopeService._contains_phrase(normalized, term) for term in terms):
                    return {"route": "database", "action": action, "inScope": True}

        if any(ScopeService._contains_phrase(normalized, term) for term in OUT_OF_SCOPE_TERMS):
            return {"route": "out_of_scope", "action": None, "inScope": False}

        has_document_code = any(
            re.search(rf"(?<!\w){code}(?!\w)", normalized)
            for code in ("tor", "cor", "coe")
        )
        if (
            any(term in normalized for term in ACADEMIC_TERMS)
            or has_document_code
            or any(phrase in normalized for phrase in ACADEMIC_PHRASES)
            or ScopeService.is_student_services_faq_query(normalized)
        ):
            return {"route": "policy", "action": None, "inScope": True}

        greetings = {
            "hello", "hi", "hey", "good morning", "good afternoon", "kumusta", "maayong adlaw",
            "maayong buntag", "maayong hapon", "naimbag nga aldaw", "naimbag nga bigat",
            "maayong aga", "maupay nga adlaw", "maupay nga aga", "maupay nga udto",
        }
        if normalized in greetings:
            return {"route": "greeting", "action": None, "inScope": True}

        return {"route": "out_of_scope", "action": None, "inScope": False}


scope_service = ScopeService()
