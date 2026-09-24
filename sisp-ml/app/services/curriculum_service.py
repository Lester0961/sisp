"""Resolve curriculum questions to the approved, program-specific source."""

import re
import unicodedata

from app.services.retrieval_service import retrieval_service
from app.approved_sources import APPROVED_STATIC_SOURCES


COURSE_ROW = re.compile(
    r"^\s*[-*]\s*(?P<code>[A-Z]{2,6}\s*\d{1,4}[A-Z]?)\s*[—–-]\s*"
    r"(?P<title>[^|]+?)\s*\|\s*LEC\s+\d+(?:\.\d+)?\s+LAB\s+\d+(?:\.\d+)?\s+Units\s+(?P<units>\d+)"
    r"(?:\s*\|\s*(?:Prereq|Prerequisite|Prer\.?)\s*:\s*(?P<prerequisites>.*?))?\s*$",
    re.I,
)
CURRICULUM_SECTION = re.compile(
    r"^\s*(?P<year>(?:First|Second|Third|Fourth)\s+Year)\s*[—–-]\s*"
    r"(?P<term>(?:First|Second|Third)\s+(?:Trimester|Term))\s*:?\s*$",
    re.I,
)
CURRICULUM_LIST_ROW = re.compile(
    r"^\s*[-*]\s*(?:(?P<code>\(no code\)|[A-Z]{2,6}\s*\d{1,4}[A-Z]?)\s*[—–-]\s*)?"
    r"(?P<title>[^|]+?)\s*\|\s*LEC\s+\d+(?:\.\d+)?\s+LAB\s+\d+(?:\.\d+)?\s+Units\s+(?P<units>\d+)"
    r"(?:\s*\|\s*(?:Prereq|Prerequisite|Prer\.?)\s*:\s*(?P<prerequisites>.*?))?\s*$",
    re.I,
)

YEAR_CUES = {
    "First Year": ("first year", "1st year", "year 1", "year one", "freshman", "unang taon", "unang tuig", "umuna a tawen", "umuna nga tuig", "una nga tuig", "siyahan nga tuig"),
    "Second Year": ("second year", "2nd year", "year 2", "year two", "sophomore", "ikalawang taon", "ikaduhang tuig", "maikadua a tawen", "ikaduha nga tuig", "ikalawa nga tuig"),
    "Third Year": ("third year", "3rd year", "year 3", "year three", "junior", "ikatlong taon", "ikatulong tuig", "maikatlo a tawen", "ikatlo nga tuig", "ikatulo nga tuig"),
    "Fourth Year": ("fourth year", "4th year", "year 4", "year four", "senior", "ikaapat na taon", "ikaapat nga tuig", "maikapat a tawen", "ika-upat nga tuig"),
}
TRIMESTER_CUES = {
    "First Trimester": ("first trimester", "1st trimester", "trimester 1", "first term", "1st term", "term 1", "unang trimester", "unang term", "umuna a trimester", "umuna nga trimester", "una nga trimester", "siyahan nga trimester"),
    "Second Trimester": ("second trimester", "2nd trimester", "trimester 2", "second term", "2nd term", "term 2", "ikalawang trimester", "ikaduhang trimester", "maikadua a trimester", "ikaduha nga trimester", "ikalawa nga trimester"),
    "Third Trimester": ("third trimester", "3rd trimester", "trimester 3", "third term", "3rd term", "term 3", "ikatlong trimester", "ikatulong trimester", "maikatlo a trimester", "ikatlo nga trimester", "ikatulo nga trimester"),
}


def _has_any_phrase(normalized: str, phrases: tuple[str, ...]) -> bool:
    padded = f" {normalized} "
    return any(
        f" {normalize_query(phrase)} " in padded
        for phrase in phrases
    )


def extract_curriculum_filters(query: str) -> tuple[str | None, str | None]:
    """Extract one explicitly named year and/or trimester from multilingual text."""
    normalized = normalize_query(query)
    years = [name for name, cues in YEAR_CUES.items() if _has_any_phrase(normalized, cues)]
    trimesters = [name for name, cues in TRIMESTER_CUES.items() if _has_any_phrase(normalized, cues)]
    return (years[0] if len(years) == 1 else None, trimesters[0] if len(trimesters) == 1 else None)


CURRICULUM_SOURCES = {
    "curriculum_BEED_2024.txt": ("beed", "elementary education", "bachelor of elementary education"),
    "curriculum_BSCrim_2026.txt": ("bscrim", "bscriminology", "bs crim", "criminology"),
    "curriculum_BSCS_2024.txt": ("bscs", "bs cs", "computer science", "bachelor of science in computer science"),
    "curriculum_BSMA_2026.txt": ("bsma", "multimedia arts", "multimedia art"),
    "curriculum_BSOA_2024.txt": ("bsoa", "office administration", "office admin"),
    "curriculum_BSEd-Eng_2024.txt": ("bsed eng", "bsed english", "secondary education english", "secondary education major in english"),
    "curriculum_BSEd-Math_2024.txt": ("bsed math", "bsed mathematics", "secondary education mathematics", "secondary education major in mathematics"),
    "curriculum_BSEd-Fil-2024_2024.txt": ("bsed filipino 2024", "bsed fil 2024", "secondary education filipino 2024"),
    "curriculum_BSEd-Fil-2026_2026.txt": ("bsed filipino 2026", "bsed fil 2026", "secondary education filipino 2026"),
}

CURRICULUM_TERMS = (
    "curriculum", "subject", "subjects", "course", "courses", "course sequence", "courses offered",
    "class list", "kurso", "asignatura", "aralin", "mga klase", "mga subject", "dagiti subject",
    "subjects ko", "subject ko", "subject nako", "subjects nako", "subjects ko ha", "mga subject sang",
    "subjects sang", "subjects han", "mga subject ha", "subject ko ha", "subjects nako sa",
    "prerequisite", "prereq", "course code", "course unit", "units", "term", "trimester", "semester",
    "effective year", "effective school year", "program",
)
COURSE_LIST_TERMS = (
    "subject", "subjects", "course", "courses", "kurso", "asignatura", "aralin", "class list",
    "mga klase", "mga subject", "mga subjects", "dagiti subject", "dagiti kurso", "subjects ko",
    "subject ko", "subjects nako", "subjects ko ha", "listahan sang subject", "lista sang mga subject", "lista han mga subject",
    "tanang subject", "tanang kurso", "tanan nga subject", "tanan nga kurso", "ngatanan nga subject", "ngatanan nga kurso",
    "list of courses", "list of subjects", "list of classes", "course list", "subject list",
    "listahan ng courses", "listahan ng kurso", "lahat ng subject", "all subjects", "all courses",
)
FULL_LIST_TERMS = (
    "all subjects", "all courses", "all classes", "list of subjects", "list of courses", "course list",
    "subject list", "subjects", "courses", "class list", "subjects ko", "subject ko", "mga subject", "mga subjects", "dagiti subject",
    "dagiti kurso", "listahan ng kurso", "listahan ng courses", "listahan sang subject",
    "lista sang mga subject", "lista han mga subject", "lahat ng subject", "my subjects", "my courses", "what subjects",
    "tanang subject", "tanang kurso", "tanan nga subject", "tanan nga kurso", "ngatanan nga subject", "ngatanan nga kurso",
    "which subjects", "subjects in", "subjects for", "subjects sa", "subjects ha", "subject sequence",
)
EXPLICIT_FULL_LIST_TERMS = (
    "all subjects", "all courses", "all classes", "list of subjects", "list of courses",
    "list of classes", "course list", "subject list", "class list", "listahan ng kurso",
    "listahan ng courses", "lahat ng subject", "lahat ng kurso", "tanang subject",
    "tanang kurso", "amin a subject", "amin dagiti kurso", "lista sang mga subject", "lista han mga subject",
    "tanan nga subject", "tanan nga kurso", "ngatanan nga subject", "ngatanan nga kurso",
)

COURSE_ANSWER_TEMPLATES = {
    "en": {
        "details": "{course} is listed in {section} and carries {units} units in the verified {program} curriculum.",
        "units": "{course} carries {units} units in the verified {program} curriculum.",
        "year_term": "{course} is listed in {section} of the verified {program} curriculum.",
        "prerequisite": "The verified {program} curriculum lists {prerequisites} as the prerequisite for {course}.",
        "no_prerequisite": "The verified {program} curriculum does not list a prerequisite for {course}.",
        "exists": "Yes. {course} appears in the verified {program} curriculum.",
        "specific": "In the verified {program} curriculum, {course} is worth {units} units{section_clause}{prerequisite_clause}.",
        "section_clause": " and is listed in {section}",
        "prerequisite_clause": ". Its listed prerequisite is {prerequisites}",
    },
    "fil": {
        "details": "Ang {course} ay nakalista sa {section} at may {units} units sa verified na curriculum ng {program}.",
        "units": "Ang {course} ay may {units} units sa verified na curriculum ng {program}.",
        "year_term": "Nakalista ang {course} sa {section} ng verified na curriculum ng {program}.",
        "prerequisite": "Ang nakalistang prerequisite ng {course} sa curriculum ng {program} ay {prerequisites}.",
        "no_prerequisite": "Walang prerequisite na nakalista para sa {course} sa verified na curriculum ng {program}.",
        "exists": "Oo. Kasama ang {course} sa verified na curriculum ng {program}.",
        "specific": "Sa verified na curriculum ng {program}, may {units} units ang {course}{section_clause}{prerequisite_clause}.",
        "section_clause": " at nakalista ito sa {section}",
        "prerequisite_clause": ". Nakalistang prerequisite: {prerequisites}",
    },
    "ceb": {
        "details": "Ang {course} naa sa {section} ug adunay {units} units sa verified nga curriculum sa {program}.",
        "units": "Ang {course} adunay {units} units sa verified nga curriculum sa {program}.",
        "year_term": "Nakalista ang {course} sa {section} sa verified nga curriculum sa {program}.",
        "prerequisite": "Sa curriculum sa {program}, ang gilista nga prerequisite sa {course} mao ang {prerequisites}.",
        "no_prerequisite": "Walay prerequisite nga gilista para sa {course} sa verified nga curriculum sa {program}.",
        "exists": "Oo. Apil ang {course} sa verified nga curriculum sa {program}.",
        "specific": "Sa verified nga curriculum sa {program}, {units} units ang {course}{section_clause}{prerequisite_clause}.",
        "section_clause": " ug nakalista kini sa {section}",
        "prerequisite_clause": ". Ang gilista nga prerequisite mao ang {prerequisites}",
    },
    "ilo": {
        "details": "Ti {course} ket nailista iti {section} ken addaan iti {units} units iti napasingkedan a curriculum ti {program}.",
        "units": "Ti {course} ket addaan iti {units} units iti napasingkedan a curriculum ti {program}.",
        "year_term": "Nailista ti {course} iti {section} ti napasingkedan a curriculum ti {program}.",
        "prerequisite": "Iti curriculum ti {program}, {prerequisites} ti nailista a prerequisite para iti {course}.",
        "no_prerequisite": "Awan ti nailista a prerequisite para iti {course} iti napasingkedan a curriculum ti {program}.",
        "exists": "Wen. Nailista ti {course} iti napasingkedan a curriculum ti {program}.",
        "specific": "Iti napasingkedan a curriculum ti {program}, addaan iti {units} units ti {course}{section_clause}{prerequisite_clause}.",
        "section_clause": " ken nailista iti {section}",
        "prerequisite_clause": ". Ti nailista a prerequisite ket {prerequisites}",
    },
    "hil": {
        "details": "Ang {course} ara sa {section} kag may {units} units sa verified nga curriculum sang {program}.",
        "units": "Ang {course} may {units} units sa verified nga curriculum sang {program}.",
        "year_term": "Nakalista ang {course} sa {section} sang verified nga curriculum sang {program}.",
        "prerequisite": "Ang nakalista nga prerequisite sang {course} sa curriculum sang {program} amo ang {prerequisites}.",
        "no_prerequisite": "Wala sang prerequisite nga nakalista para sa {course} sa verified nga curriculum sang {program}.",
        "exists": "Huo. Ara ang {course} sa verified nga curriculum sang {program}.",
        "specific": "Sa verified nga curriculum sang {program}, may {units} units ang {course}{section_clause}{prerequisite_clause}.",
        "section_clause": " kag nakalista ini sa {section}",
        "prerequisite_clause": ". Ang nakalista nga prerequisite amo ang {prerequisites}",
    },
    "war": {
        "details": "An {course} nakalista ha {section} ngan may {units} units ha napamatud-an nga curriculum han {program}.",
        "units": "An {course} may {units} units ha napamatud-an nga curriculum han {program}.",
        "year_term": "Nakalista an {course} ha {section} han napamatud-an nga curriculum han {program}.",
        "prerequisite": "Ha curriculum han {program}, {prerequisites} an nakalista nga prerequisite para han {course}.",
        "no_prerequisite": "Waray prerequisite nga nakalista para han {course} ha napamatud-an nga curriculum han {program}.",
        "exists": "Oo. Aada an {course} ha napamatud-an nga curriculum han {program}.",
        "specific": "Ha napamatud-an nga curriculum han {program}, may {units} units an {course}{section_clause}{prerequisite_clause}.",
        "section_clause": " ngan nakalista ini ha {section}",
        "prerequisite_clause": ". An nakalista nga prerequisite amo an {prerequisites}",
    },
}

FOLLOW_UP_MARKERS = (
    "what about", "how about", "and in", "and for", "what are they in",
    "paano naman", "ano naman", "at sa", "sa third year", "sa second year",
    "sa first year", "sa fourth year", "third year naman", "second year naman",
    "unsa man", "unsa pud", "unsa sad", "ania dagiti", "kasano met", "paano naman", "ano naman",
    "ano ang mga", "ano it mga", "ano ang subject", "mga subject ko",
    "and what", "what comes next", "what comes in the next", "restate", "short list",
    "ano naman ang kasunod", "unsa ang sunod", "ania ti sumaruno",
)


def normalize_query(text: str) -> str:
    folded = unicodedata.normalize("NFKD", (text or "").casefold())
    ascii_folded = "".join(char for char in folded if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", ascii_folded).strip()


def is_curriculum_query(text: str) -> bool:
    normalized = normalize_query(text)
    if any(term in normalized for term in CURRICULUM_TERMS):
        return True
    # Course lookups often name a known program and subject but omit the word
    # "curriculum" (for example, "Which BSCS term is Calculus 1 listed in?").
    # Require both a resolved catalog program and a course/term cue so an
    # arbitrary mention of a degree code does not claim the whole query.
    if not resolve_curriculum_source(text):
        return False
    return any(
        term in normalized
        for term in ("listed", "term", "year", "prerequisite", "calculus", "effective", "which course", "what course")
    )


def is_course_list_query(text: str) -> bool:
    normalized = normalize_query(text)
    return any(term in normalized for term in COURSE_LIST_TERMS)


def is_full_course_list_query(text: str) -> bool:
    normalized = normalize_query(text)
    return any(term in normalized for term in FULL_LIST_TERMS)


def is_explicit_full_course_list_query(text: str) -> bool:
    normalized = normalize_query(text)
    return any(term in normalized for term in EXPLICIT_FULL_LIST_TERMS)


def is_curriculum_follow_up(text: str) -> bool:
    normalized = normalize_query(text)
    return any(marker in normalized for marker in FOLLOW_UP_MARKERS)


def resolve_curriculum_source(text: str) -> str | None:
    """Match a named program to a specific approved curriculum file.

    The two Filipino BSEd curricula require an explicit year so ARIA does not
    silently choose a potentially outdated version.
    """
    normalized = f" {normalize_query(text)} "

    # Check specific forms before broad aliases.
    for source, aliases in CURRICULUM_SOURCES.items():
        for alias in aliases:
            needle = f" {normalize_query(alias)} "
            if needle in normalized:
                return source

    if " bsed fil " in normalized or " bsed filipino " in normalized:
        if " 2024 " in normalized:
            return "curriculum_BSEd-Fil-2024_2024.txt"
        if " 2026 " in normalized:
            return "curriculum_BSEd-Fil-2026_2026.txt"
    return None


def is_ambiguous_filipino_bsed(text: str) -> bool:
    normalized = f" {normalize_query(text)} "
    names_program = " bsed fil " in normalized or " bsed filipino " in normalized
    names_year = " 2024 " in normalized or " 2026 " in normalized
    return names_program and not names_year


def get_curriculum_source(text: str, history: list[dict] | None = None) -> tuple[str | None, bool]:
    """Return (source, inherited_from_history) for a self-contained query or follow-up."""
    source = resolve_curriculum_source(text)
    if source:
        return source, False
    # A complete curriculum fact can omit the program when it naturally
    # continues a recent curriculum conversation (for example, asking for a
    # course prerequisite after asking about BSCS subjects).
    if not (is_curriculum_follow_up(text) or is_curriculum_query(text)):
        return None, False
    for item in reversed(history or []):
        if item.get("role") != "user":
            continue
        source = resolve_curriculum_source(item.get("content", ""))
        if source:
            return source, True
    return None, False


def extract_curriculum_filters_with_history(
    text: str,
    history: list[dict] | None = None,
) -> tuple[str | None, str | None]:
    """Inherit only missing year/term filters from the latest curriculum anchor."""
    year, trimester = extract_curriculum_filters(text)
    # An explicitly named year asks for that whole year unless the user also
    # names a trimester. Do not let a previous trimester narrow a new request.
    if year or not history or not (is_curriculum_follow_up(text) or is_curriculum_query(text)):
        return year, trimester

    source = resolve_curriculum_source(text)
    for item in reversed(history):
        if item.get("role") != "user":
            continue
        prior_text = str(item.get("content", ""))
        prior_source = resolve_curriculum_source(prior_text)
        if source and prior_source and prior_source != source:
            # A different explicit program starts a new curriculum context.
            break
        if not source and prior_source:
            source = prior_source
        prior_year, prior_trimester = extract_curriculum_filters(prior_text)
        if year is None and prior_year:
            year = prior_year
        if trimester is None and prior_trimester:
            trimester = prior_trimester
        if prior_source and (year is not None or trimester is not None):
            break
    return year, trimester


def infer_next_term_filters(
    text: str,
    history: list[dict] | None = None,
) -> tuple[str | None, str | None]:
    """Resolve a next-term follow-up from its recent program/year/term anchor.

    When a year is known but no starting term was named, use the first listed
    trimester as the sequence anchor and return the second. The rendered
    response identifies the exact section so this assumption is visible.
    """
    year, trimester = extract_curriculum_filters_with_history(text, history)
    if not year:
        return None, None

    years = ("First Year", "Second Year", "Third Year", "Fourth Year")
    terms = ("First Trimester", "Second Trimester", "Third Trimester")
    if not trimester:
        return year, terms[1]
    try:
        current_term = terms.index(trimester)
        current_year = years.index(year)
    except ValueError:
        return None, None

    if current_term < len(terms) - 1:
        return year, terms[current_term + 1]
    if current_year < len(years) - 1:
        return years[current_year + 1], terms[0]
    return None, None


def is_ambiguous_next_term_follow_up(text: str) -> bool:
    normalized = normalize_query(text)
    return any(
        phrase in normalized
        for phrase in (
            "what comes next trimester", "what comes in the next trimester",
            "what comes next term", "what comes in the next term",
            "unsa ang sunod nga trimester", "unsa ang sunod nga term",
            "ano ang susunod na trimester", "ano ang susunod na term",
            "ania ti sumaruno a trimester", "ania ti sumaruno a term",
        )
    )


class CurriculumService:
    @staticmethod
    def retrieve(source: str) -> list[dict]:
        return retrieval_service.retrieve_source(source)

    @staticmethod
    def retrieve_for_query(
        source: str,
        query: str,
        course_codes: list[str] | None = None,
        course_name: str | None = None,
        limit: int = 3,
    ) -> list[dict]:
        """Select relevant chunks from the already-resolved approved curriculum."""
        chunks = retrieval_service.retrieve_source(source)
        if not chunks:
            return []

        normalized_chunks = [normalize_query(item.get("content", "")) for item in chunks]
        if course_name:
            normalized_name = normalize_query(course_name)
            matched = [
                item for item, content in zip(chunks, normalized_chunks)
                if normalized_name in content
            ]
            if matched:
                return matched[:limit]

        codes = [normalize_query(code) for code in (course_codes or [])]
        if codes:
            matched = [
                item for item, content in zip(chunks, normalized_chunks)
                if any(code.replace(" ", "") in content.replace(" ", "") for code in codes)
            ]
            if matched:
                return matched[:limit]

        stop_words = {
            "what", "which", "where", "when", "how", "many", "does", "is", "the", "a", "an", "of", "in", "for", "to", "my", "are", "me",
            "ano", "ang", "mga", "sa", "ko", "akin", "saan", "alin", "ilang", "ba", "naman", "ito", "iyan", "mo",
            "unsa", "akong", "mga", "sa", "ko", "asa", "giunsa", "unsaon", "palihog", "ba", "man",
            "ania", "dagiti", "ti", "iti", "kasano", "sadino", "apay", "wenno", "ak", "ko",
            "ano", "sang", "kag", "ukon", "diin", "nga", "ang", "sa", "ko", "gid",
            "ano", "it", "han", "ha", "hin", "an", "ngan", "o", "ko", "akon",
            "subject", "subjects", "course", "courses", "curriculum", "kurso", "asignatura", "aralin", "trimester", "semester", "units", "unit",
        }
        terms = [term for term in normalize_query(query).split() if len(term) > 1 and term not in stop_words]
        scored = []
        for index, (item, content) in enumerate(zip(chunks, normalized_chunks)):
            score = sum(1 for term in terms if re.search(rf"\b{re.escape(term)}\b", content))
            if score:
                scored.append((score, index, item))
        scored.sort(key=lambda row: (-row[0], row[1]))
        return [item for _, _, item in scored[:limit]]

    @staticmethod
    def format_year_term_answer(
        source: str,
        query: str,
        language_code: str,
        history: list[dict] | None = None,
    ) -> str | None:
        """Return the selected approved curriculum year/trimester without an LLM."""
        selected_year, selected_trimester = extract_curriculum_filters_with_history(query, history)
        if not selected_year and not selected_trimester:
            return None

        records = []
        current_section = None
        for chunk in CurriculumService.retrieve(source):
            for line in (chunk.get("content") or "").splitlines():
                heading = CURRICULUM_SECTION.match(line)
                if heading:
                    current_section = (heading.group("year"), heading.group("term"))
                    continue
                row = CURRICULUM_LIST_ROW.match(line)
                if row and current_section:
                    records.append({
                        "year": current_section[0],
                        "trimester": current_section[1],
                        "code": re.sub(r"\s+", " ", (row.group("code") or "").strip()),
                        "title": row.group("title").strip(),
                        "units": row.group("units"),
                    })

        selected = [
            row for row in records
            if (not selected_year or row["year"].casefold() == selected_year.casefold())
            and (
                not selected_trimester
                or row["trimester"].casefold().replace(" term", " trimester")
                == selected_trimester.casefold()
            )
        ]
        if not selected:
            return None

        # Preserve the original curriculum's section order while de-duplicating
        # course rows across chunks.
        sections: dict[tuple[str, str], list[dict]] = {}
        for row in selected:
            sections.setdefault((row["year"], row["trimester"]), []).append(row)

        labels = {
            "en": {
                "First Year": "First Year", "Second Year": "Second Year", "Third Year": "Third Year", "Fourth Year": "Fourth Year",
                "First Trimester": "First Trimester", "Second Trimester": "Second Trimester", "Third Trimester": "Third Trimester",
                "First Term": "First Term", "Second Term": "Second Term", "Third Term": "Third Term",
                "intro": "In the verified {program} curriculum, the requested subjects are:",
                "planned": "This is the program's planned curriculum; it does not confirm your current enrollment.",
            },
            "fil": {
                "First Year": "Unang Taon", "Second Year": "Ikalawang Taon", "Third Year": "Ikatlong Taon", "Fourth Year": "Ikaapat na Taon",
                "First Trimester": "Unang Trimester", "Second Trimester": "Ikalawang Trimester", "Third Trimester": "Ikatlong Trimester",
                "First Term": "Unang Term", "Second Term": "Ikalawang Term", "Third Term": "Ikatlong Term",
                "intro": "Sa beripikadong curriculum ng {program}, ito ang mga subject na hiniling mo:",
                "planned": "Ito ang nakaplanong curriculum ng programa; hindi nito kinukumpirma ang kasalukuyan mong enrollment.",
            },
            "ceb": {
                "First Year": "Unang Tuig", "Second Year": "Ikaduhang Tuig", "Third Year": "Ikatulong Tuig", "Fourth Year": "Ikaupat nga Tuig",
                "First Trimester": "Unang Trimester", "Second Trimester": "Ikaduhang Trimester", "Third Trimester": "Ikatulong Trimester",
                "First Term": "Unang Term", "Second Term": "Ikaduhang Term", "Third Term": "Ikatulong Term",
                "intro": "Sa verified nga curriculum sa {program}, mao kini ang mga subject nga imong gipangayo:",
                "planned": "Kini ang giplanong curriculum sa programa; dili kini kumpirmasyon sa imong kasamtangang enrollment.",
            },
            "ilo": {
                "First Year": "Umuna a Tawen", "Second Year": "Maikadua a Tawen", "Third Year": "Maikatlo a Tawen", "Fourth Year": "Maikapat a Tawen",
                "First Trimester": "Umuna a Trimester", "Second Trimester": "Maikadua a Trimester", "Third Trimester": "Maikatlo a Trimester",
                "First Term": "Umuna a Term", "Second Term": "Maikadua a Term", "Third Term": "Maikatlo a Term",
                "intro": "Iti napasingkedan a curriculum ti {program}, dagitoy dagiti subject a kiniddawmo:",
                "planned": "Daytoy ti nakaplan a curriculum ti programa; saan a pammaneknek ti agdama nga enrollment-mo.",
            },
            "hil": {
                "First Year": "Una nga Tuig", "Second Year": "Ikaduha nga Tuig", "Third Year": "Ikatlo nga Tuig", "Fourth Year": "Ikaapat nga Tuig",
                "First Trimester": "Una nga Trimester", "Second Trimester": "Ikaduha nga Trimester", "Third Trimester": "Ikatlo nga Trimester",
                "First Term": "Una nga Term", "Second Term": "Ikaduha nga Term", "Third Term": "Ikatlo nga Term",
                "intro": "Sa verified nga curriculum sang {program}, amo ini ang mga subject nga ginpangayo mo:",
                "planned": "Ini ang nakaplano nga curriculum sang programa; indi ini kumpirmasyon sang imo enrollment subong.",
            },
            "war": {
                "First Year": "Siyahan nga Tuig", "Second Year": "Ikaduha nga Tuig", "Third Year": "Ikatulo nga Tuig", "Fourth Year": "Ika-upat nga Tuig",
                "First Trimester": "Siyahan nga Trimester", "Second Trimester": "Ikaduha nga Trimester", "Third Trimester": "Ikatulo nga Trimester",
                "First Term": "Siyahan nga Term", "Second Term": "Ikaduha nga Term", "Third Term": "Ikatulo nga Term",
                "intro": "Ha napamatud-an nga curriculum han {program}, amo ini an mga subject nga imo ginpakiana:",
                "planned": "Ini an ginplano nga curriculum han programa; diri hini ginpapamatud-an an imo yana nga enrollment.",
            },
        }
        words = labels.get(language_code, labels["en"])
        program = source.removeprefix("curriculum_").split("_")[0].replace("-", " ")
        output = [words["intro"].format(program=program)]
        for (year, trimester), rows in sections.items():
            output.append(f"\n### {words[year]} — {words[trimester]}")
            output.extend(
                f"- {row['code'] + ' — ' if row['code'] and row['code'].casefold() != '(no code)' else ''}{row['title']} ({row['units']} units)"
                for row in rows
            )
        output.append(f"\n{words['planned']}")
        return "\n".join(output)

    @staticmethod
    def format_catalog_answer(query: str, language_code: str) -> str | None:
        """Answer catalog metadata from its approved source, without generation."""
        source = "program_catalog.txt"
        if source not in APPROVED_STATIC_SOURCES:
            return None
        chunks = retrieval_service.retrieve_source(source)
        content = "\n".join(chunk.get("content", "") for chunk in chunks)
        if not content:
            return None
        rows = []
        for line in content.splitlines():
            match = re.match(
                r"\s*[-*]\s*(?P<code>[^:]+):\s*(?P<title>.+?)\s+\|\s*Effective\s*(?P<effective>.*?)\s*\|\s*CMO\s+(?P<cmo>.*?)\s*\|\s*(?P<count>\d+)\s+courses\s*\|\s*file\s+(?P<file>\S+)",
                line,
                re.I,
            )
            if match:
                row = {key: (value or "").strip() for key, value in match.groupdict().items()}
                row["cmo"] = re.sub(r"(?i)^cmo\s+", "", row["cmo"])
                rows.append(row)

        normalized = normalize_query(query)
        asks_program_list = any(term in normalized for term in (
            "programs offered", "what programs", "which programs", "list programs", "all programs",
            "degree programs", "program catalog", "programmes offered", "what degrees",
            "name all academic programs", "list all academic programs", "all academic programs",
            "what academic programs", "programs does rmc offer", "programs does rmc have",
            "what are all the programs", "academic programs at rmc", "academic programmes",
            "ano ang lahat ng programa", "anu ano ang mga programa", "unsa nga mga programa",
            "ania dagiti programa", "ano nga mga programa", "ano it mga programa",
        ))
        asks_term_structure = any(term in normalized for term in (
            "terms per year", "terms in a year", "academic terms", "assessment periods", "prelim midterm finals",
            "how many terms", "how many trimester",
        ))

        if asks_term_structure:
            translations = {
                "en": "RMC's verified catalog lists three academic terms per year: Term 1, Term 2, and Term 3. Each term has Prelim, Midterm, and Finals assessment periods.",
                "fil": "Ayon sa verified na catalog ng RMC, may tatlong academic term bawat taon: Term 1, Term 2, at Term 3. Bawat term ay may Prelim, Midterm, at Finals na assessment period.",
                "ceb": "Sumala sa verified nga catalog sa RMC, adunay tulo ka academic term matag tuig: Term 1, Term 2, ug Term 3. Ang matag term adunay Prelim, Midterm, ug Finals nga assessment period.",
                "ilo": "Segun iti napasingkedan a catalog ti RMC, adda tallo nga academic term iti tunggal tawen: Term 1, Term 2, ken Term 3. Tunggal term ket addaan iti Prelim, Midterm, ken Finals a panahon ti assessment.",
                "hil": "Suno sa verified nga catalog sang RMC, may tatlo ka academic term kada tuig: Term 1, Term 2, kag Term 3. Ang kada term may Prelim, Midterm, kag Finals nga assessment period.",
                "war": "Sumala han napamatud-an nga catalog han RMC, may tulo nga academic term kada tuig: Term 1, Term 2, ngan Term 3. An kada term may Prelim, Midterm, ngan Finals nga assessment period.",
            }
            return translations.get(language_code, translations["en"])

        if asks_program_list:
            if not rows:
                return None
            intro = {
                "en": "The verified RMC program catalog lists:",
                "fil": "Ito ang mga programang nakalista sa verified na catalog ng RMC:",
                "ceb": "Mao kini ang mga programa nga gilista sa verified nga catalog sa RMC:",
                "ilo": "Dagitoy dagiti programa a nailista iti napasingkedan a catalog ti RMC:",
                "hil": "Amo ini ang mga programa nga nalista sa verified nga catalog sang RMC:",
                "war": "Amo ini an mga programa nga nakalista ha napamatud-an nga catalog han RMC:",
            }.get(language_code, "The verified RMC program catalog lists:")
            return intro + "\n" + "\n".join(f"- {row['code']}: {row['title']} ({row['count']} courses)" for row in rows)

        padded = f" {normalized} "
        compares = any(term in padded for term in (
            " compare ", " comparison ", " difference ", " differ ", " distinguish ", " distinguishes ",
        )) or "how does the catalog distinguish" in normalized
        asks_filipino_version_comparison = (
            compares
            and any(term in normalized for term in ("filipino", "bsed fil"))
            and "2024" in normalized
            and "2026" in normalized
        )
        if asks_filipino_version_comparison:
            versions = [item for item in rows if item["code"].casefold().startswith("bsed-fil-")]
            versions.sort(key=lambda item: item["effective"])
            if len(versions) >= 2:
                introductions = {
                    "en": "The verified catalog distinguishes two Filipino curriculum files:",
                    "fil": "Magkahiwalay na Filipino curriculum file ang nakalista sa verified na catalog:",
                    "ceb": "Duha ka managlahi nga Filipino curriculum file ang naa sa verified nga catalog:",
                    "ilo": "Adda dua a naisina a Filipino curriculum file iti napasingkedan a catalog:",
                    "hil": "Duha ka lain nga Filipino curriculum file ang nalista sa verified nga catalog:",
                    "war": "Duha nga magkaiba nga Filipino curriculum file an nakalista ha napamatud-an nga catalog:",
                }
                conclusions = {
                    "en": "Both list the same course count. The catalog distinguishes them by title, effective year, and CMO, but gives no course-by-course change summary.",
                    "fil": "Pareho ang bilang ng kurso. Magkaiba ang pamagat, effective year, at CMO; walang buod sa catalog ng pagbabago sa bawat kurso.",
                    "ceb": "Pareho ang gidaghanon sa kurso. Lahi ang titulo, effective year, ug CMO; walay course-by-course nga summary sa mga kausaban sa catalog.",
                    "ilo": "Agpada ti bilang dagiti kurso. Nagduduma ti titulo, effective year, ken CMO; awan ti buod ti catalog kadagiti panagbalbaliw iti tunggal kurso.",
                    "hil": "Pareho ang kadamuon sang kurso. Lain ang titulo, effective year, kag CMO; wala sang course-by-course nga summary sang pagbag-o sa catalog.",
                    "war": "Pareho an kadamuon han mga kurso. Magkaiba an titulo, effective year, ngan CMO; waray course-by-course nga sumaryo han mga pagbag-o ha catalog.",
                }
                detail_templates = {
                    "en": "- {code}: {title}; effective {effective}; CMO {cmo}; {count} courses",
                    "fil": "- {code}: {title}; epektibo {effective}; CMO {cmo}; {count} kurso",
                    "ceb": "- {code}: {title}; epektibo {effective}; CMO {cmo}; {count} ka kurso",
                    "ilo": "- {code}: {title}; epektibo {effective}; CMO {cmo}; {count} a kurso",
                    "hil": "- {code}: {title}; epektibo {effective}; CMO {cmo}; {count} ka kurso",
                    "war": "- {code}: {title}; epektibo {effective}; CMO {cmo}; {count} nga kurso",
                }
                items = "\n".join(
                    detail_templates.get(language_code, detail_templates["en"]).format(
                        code=item["code"],
                        title=item["title"],
                        effective=item["effective"] or "not specified",
                        cmo=item["cmo"] or "not specified",
                        count=item["count"],
                    )
                    for item in versions
                )
                intro = introductions.get(language_code, introductions["en"])
                conclusion = conclusions.get(language_code, conclusions["en"])
                return f"{intro}\n{items}\n{conclusion}"

        asks_course_counts = any(term in normalized for term in (
            " course count", " course counts", " number of courses", " count of courses",
            " how many courses", " how many subjects", " course totals",
        ))
        if compares and asks_course_counts:
            mentioned = []
            for catalog_row in rows:
                aliases = CURRICULUM_SOURCES.get(catalog_row["file"], ())
                names = (catalog_row["code"], *aliases)
                if any(f" {normalize_query(name)} " in padded for name in names if name):
                    mentioned.append(catalog_row)
            if len(mentioned) >= 2:
                entries = [f"{item['code']}: {item['count']} courses" for item in mentioned]
                if len(mentioned) == 2:
                    difference = abs(int(mentioned[0]["count"]) - int(mentioned[1]["count"]))
                    translations = {
                        "en": "The verified catalog lists {items}, a difference of {difference} courses.",
                        "fil": "Nakalista sa verified na catalog ang {items}; may diperensiyang {difference} na kurso.",
                        "ceb": "Gilista sa verified nga catalog ang {items}; adunay kalainan nga {difference} ka kurso.",
                        "ilo": "Nailista iti napasingkedan a catalog dagiti {items}; addaan iti nagdudumaan a {difference} a kurso.",
                        "hil": "Nakalista sa verified nga catalog ang {items}; may kalainan nga {difference} ka kurso.",
                        "war": "Nakalista ha napamatud-an nga catalog an {items}; may kaibahan nga {difference} nga kurso.",
                    }
                    return translations.get(language_code, translations["en"]).format(
                        items=" and ".join(entries), difference=difference
                    )
                return "The verified catalog lists these course counts: " + "; ".join(entries) + "."

        curriculum_source = resolve_curriculum_source(query)
        if not curriculum_source:
            return None
        matching = [row for row in rows if row["file"] == curriculum_source]
        if not matching:
            return None
        row = matching[0]
        normalized = f" {normalized} "
        asks_program_identity = any(term in normalized for term in (
            " which program is identified", " what program is identified", " identified as ",
            " what does ", " stand for", " full name of", " degree name",
        ))
        if asks_program_identity:
            note = (
                f" Its effective year is {row['effective']}."
                if row["effective"] else " The catalog does not specify an effective year for this program."
            )
            if language_code == "fil":
                return f"Tinutukoy ng verified na catalog ang {row['code']} bilang {row['title']}.{note}"
            if language_code == "ceb":
                return f"Gipaila sa verified nga catalog ang {row['code']} isip {row['title']}.{note}"
            if language_code == "ilo":
                return f"Ti {row['code']} ket nailista iti verified a catalog a kas {row['title']}.{note}"
            if language_code == "hil":
                return f"Ginkilala sang verified nga catalog ang {row['code']} bilang {row['title']}.{note}"
            if language_code == "war":
                return f"Ginkikilala han napamatud-an nga catalog an {row['code']} sugad nga {row['title']}.{note}"
            return f"The verified catalog identifies {row['code']} as {row['title']}.{note}"

        asks_count = any(term in normalized for term in (
            " how many courses ", " course count ", " course counts ", " number of courses ",
            " count of courses ", " how many subjects ",
        ))
        asks_effective = any(term in normalized for term in (
            " effective year ", " effective school year ", " effective curriculum ",
            " curriculum year ", " effective for ", " curriculum effective ",
        )) or (" school year " in normalized and " effective " in normalized)
        if not asks_count and not asks_effective:
            return None
        effective = row["effective"] or "not specified in the catalog"
        templates = {
            "en": "The verified catalog lists {code} with {count} courses. Its effective year is {effective}.",
            "fil": "Nakalista sa verified na catalog ang {code} na may {count} kurso. Ang effective year nito ay {effective}.",
            "ceb": "Gilista sa verified nga catalog ang {code} nga adunay {count} ka kurso. Ang effective year niini mao ang {effective}.",
            "ilo": "Nailista iti napasingkedan a catalog ti {code} nga addaan iti {count} a kurso. Ti effective year-na ket {effective}.",
            "hil": "Nakalista sa verified nga catalog ang {code} nga may {count} ka kurso. Ang effective year sini amo ang {effective}.",
            "war": "Nakalista ha napamatud-an nga catalog an {code} nga may {count} nga kurso. An effective year hini amo an {effective}.",
        }
        template = templates.get(language_code, templates["en"])
        return template.format(code=row["code"], count=row["count"], effective=effective)

    @staticmethod
    def format_course_answer(
        source: str,
        chunks: list[dict],
        request_type: str,
        course_codes: list[str] | None,
        course_name: str | None,
        language_code: str,
    ) -> str | None:
        """Answer a bounded curriculum fact from the named, verified source."""
        if request_type not in {
            "course_details",
            "course_units",
            "course_prerequisite",
            "year_term",
            "course_exists",
            "specific_subject",
        }:
            return None
        if not course_codes and not course_name:
            return None

        # Source retrieval preserves the year/trimester heading with each
        # group. Read the approved source again when a vector result contains
        # only a course row so the term is never guessed from another chunk.
        source_chunks = CurriculumService.retrieve(source) or chunks
        records = []
        for chunk in source_chunks:
            section = None
            for line in (chunk.get("content") or "").splitlines():
                section_match = CURRICULUM_SECTION.match(line)
                if section_match:
                    section = f"{section_match.group('year')}, {section_match.group('term')}"
                    continue
                row_match = COURSE_ROW.match(line)
                if row_match:
                    records.append({
                        "code": re.sub(r"\s+", " ", row_match.group("code")).strip(),
                        "title": row_match.group("title").strip(),
                        "units": row_match.group("units"),
                        "prerequisites": (row_match.group("prerequisites") or "").strip(),
                        "section": section,
                    })

        if course_codes:
            expected_codes = {
                re.sub(r"[\s-]+", "", code).casefold()
                for code in course_codes
            }
            matches = [
                record for record in records
                if re.sub(r"[\s-]+", "", record["code"]).casefold() in expected_codes
            ]
        else:
            expected_name = normalize_query(course_name or "")
            matches = [
                record for record in records
                if normalize_query(record["title"]) == expected_name
            ]

        if len(matches) != 1:
            return None
        record = matches[0]
        code_title = f"{record['code']} — {record['title']}"
        program = source.removeprefix("curriculum_").split("_")[0].replace("-", " ")
        units = record["units"]
        section = record["section"]
        prerequisites = record["prerequisites"]

        templates = COURSE_ANSWER_TEMPLATES.get(language_code, COURSE_ANSWER_TEMPLATES["en"])
        if request_type == "course_details":
            return templates["details"].format(
                course=code_title,
                section=section or "the listed term",
                units=units,
                program=program,
            )
        if request_type == "course_units":
            return templates["units"].format(course=code_title, units=units, program=program)
        if request_type == "year_term" and section:
            return templates["year_term"].format(course=code_title, section=section, program=program)
        if request_type == "course_prerequisite":
            key = "prerequisite" if prerequisites else "no_prerequisite"
            return templates[key].format(course=code_title, prerequisites=prerequisites, program=program)
        if request_type == "course_exists":
            return templates["exists"].format(course=code_title, program=program)
        section_clause = (
            templates["section_clause"].format(section=section)
            if section else ""
        )
        prerequisite_clause = (
            templates["prerequisite_clause"].format(prerequisites=prerequisites)
            if prerequisites else ""
        )
        return templates["specific"].format(
            course=code_title,
            units=units,
            program=program,
            section_clause=section_clause,
            prerequisite_clause=prerequisite_clause,
        )

    @staticmethod
    def format_progression_answer(source: str, query: str, language_code: str) -> str | None:
        """Build a source-backed year-to-year summary when generation is unavailable."""
        normalized = normalize_query(query)
        compare_markers = (
            "between", "compare", "comparison", "difference", "progress", "progression", "change", "changes", "sequence",
            "pagkakaiba", "pagbabago", "kalainan", "pagkalahi", "kausaban", "pag-uswag", "pagduduma",
            "pannakaiduma", "pagbaliw", "pagkalain",
        )
        compares_years = any(marker in normalized for marker in compare_markers)
        mentions_first_year = any(
            marker in normalized
            for marker in ("first year", "year 1", "unang taon", "taon 1", "unang tuig", "tuig 1", "umuna a tawen", "umuna nga tuig", "siyahan nga tuig", "una nga tuig")
        )
        mentions_second_year = any(
            marker in normalized
            for marker in ("second year", "year 2", "ikalawang taon", "taon 2", "ikaduhang tuig", "tuig 2", "maikadua a tawen", "ikaduha nga tuig", "ikalawang tuig")
        )
        if not (compares_years and mentions_first_year and mentions_second_year):
            return None

        year_courses: dict[str, list[str]] = {"First Year": [], "Second Year": []}
        for chunk in CurriculumService.retrieve(source):
            current_year = None
            for line in (chunk.get("content") or "").splitlines():
                section_match = CURRICULUM_SECTION.match(line)
                if section_match:
                    current_year = section_match.group("year")
                    continue
                row_match = COURSE_ROW.match(line)
                if row_match and current_year in year_courses:
                    title = row_match.group("title").strip()
                    if title not in year_courses[current_year]:
                        year_courses[current_year].append(title)

        first_year = year_courses["First Year"]
        second_year = year_courses["Second Year"]
        if not first_year or not second_year:
            return None

        first_examples = first_year[:4]
        second_examples = second_year[:5]

        def natural_join(items: list[str], conjunction: str = "and") -> str:
            if len(items) == 1:
                return items[0]
            return f"{', '.join(items[:-1])}, {conjunction} {items[-1]}"

        program = source.removeprefix("curriculum_").split("_")[0].replace("-", " ")
        examples = {
            "en": (
                f"In the {program} curriculum, the first year includes {natural_join(first_examples)}. "
                f"By the second year, the listed subjects include {natural_join(second_examples)}. "
                "That shows the program's planned sequence by trimester; it does not confirm which subjects you are enrolled in now."
            ),
            "fil": (
                f"Sa curriculum ng {program}, kabilang sa unang taon ang {natural_join(first_examples, 'at')}. "
                f"Pagsapit ng ikalawang taon, nakalista ang {natural_join(second_examples, 'at')}. "
                "Ipinapakita nito ang nakaplanong pagkakasunod-sunod ng programa ayon sa trimester; hindi ito kumpirmasyon ng mga subject na naka-enroll ka ngayon."
            ),
            "ceb": (
                f"Sa curriculum sa {program}, apil sa unang tuig ang {natural_join(first_examples, 'ug')}. "
                f"Sa ikaduhang tuig, gilista ang {natural_join(second_examples, 'ug')}. "
                "Kini ang giplanong han-ay sa mga kurso matag trimester; dili kini kumpirmasyon sa imong kasamtangang enrollment."
            ),
            "ilo": (
                f"Iti curriculum ti {program}, mairaman iti umuna a tawen dagiti {natural_join(first_examples, 'ken')}. "
                f"Iti maikadua a tawen, nailista dagiti {natural_join(second_examples, 'ken')}. "
                "Daytoy ti nakaplan a panagsunod dagiti kurso iti tunggal trimester; saan a paneknek ti agdama nga enrollment-mo."
            ),
            "hil": (
                f"Sa curriculum sang {program}, lakip sa una nga tuig ang {natural_join(first_examples, 'kag')}. "
                f"Sa ikaduha nga tuig, nalista ang {natural_join(second_examples, 'kag')}. "
                "Amo ini ang nakaplano nga pagkasunod-sunod sang mga kurso kada trimester; indi ini kumpirmasyon sang imo enrollment subong."
            ),
            "war": (
                f"Ha curriculum han {program}, nahilakip ha siyahan nga tuig an {natural_join(first_examples, 'ngan')}. "
                f"Ha ikaduha nga tuig, nakalista an {natural_join(second_examples, 'ngan')}. "
                "Ini an ginplano nga pagkasunod-sunod han mga kurso kada trimester; diri ini kumpirmasyon han imo yana nga enrollment."
            ),
        }
        return examples.get(language_code, examples["en"])

    @staticmethod
    def format_full_answer(source: str, chunks: list[dict], language_code: str) -> str:
        """Return the complete named curriculum without LLM list truncation.

        The classifier and source selector still route the request through the
        approved dataset. For exhaustive factual lists, preserve source text
        verbatim instead of asking a generative model to reproduce dozens of
        course rows within a variable output-token budget.
        """
        content = "\n\n".join(
            item.get("content", "").strip()
            for item in chunks
            if item.get("content", "").strip()
        )
        if not content:
            return ""

        program = source.removeprefix("curriculum_").split("_")[0].replace("-", " ")
        intros = {
            "en": (
                f"Here is the verified official {program} curriculum, organized by year and trimester. "
                "It shows the program's planned course sequence. Check your portal schedule or ask an academic adviser for your current enrolled subjects."
            ),
            "fil": (
                f"Narito ang opisyal na curriculum ng {program}, ayon sa beripikadong datos. Nakaayos ang mga kurso ayon sa taon at trimester. "
                "Planong kurso ito ng programa, hindi kumpirmasyon ng kasalukuyan mong enrollment. Para makita ang aktuwal mong subjects ngayong term, tingnan ang portal schedule o kumonsulta sa academic adviser."
            ),
            "ceb": (
                f"Mao kini ang verified nga opisyal nga curriculum sa {program}, nga gi-organisar sumala sa tuig ug trimester. "
                "Gipakita niini ang giplanong han-ay sa kurso sa programa. Tan-awa ang imong portal schedule o pangutana sa academic adviser para sa imong aktuwal nga enrollment."
            ),
            "ilo": (
                f"Daytoy ti opisial a curriculum ti {program} a naurnos segun iti tawen ken trimester, maibatay iti napasingkedan a datos. "
                "Ipakitana ti nakaplan a panagsunod dagiti kurso. Kitaem ti portal schedule-mo wenno damagem iti academic adviser dagiti aktuwal a kurso a naka-enrollam."
            ),
            "hil": (
                f"Ari ang verified nga opisyal nga curriculum sang {program}, nga gin-organisar suno sa tuig kag trimester. "
                "Ginaipakita sini ang nakaplano nga pagkasunod-sunod sang mga kurso. Tan-awa ang portal schedule mo ukon pamangkuta ang academic adviser parte sa aktuwal mo nga enrollment."
            ),
            "war": (
                f"Ini an napamatud-an nga opisyal nga curriculum han {program}, nga ginhan-ay sumala ha tuig ngan trimester. "
                "Iginpapakita hini an ginplano nga pagkasunod-sunod han mga kurso. Kitaa an portal schedule mo o pakiana ha academic adviser mahitungod han imo aktuwal nga enrollment."
            ),
        }
        intro = intros.get(language_code, intros["en"])
        return f"{intro}\n\n---\n\n{content}"


curriculum_service = CurriculumService()
