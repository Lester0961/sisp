"""Resolve curriculum questions to the approved, program-specific source."""

import re
import unicodedata

from app.services.retrieval_service import retrieval_service


COURSE_ROW = re.compile(
    r"^\s*[-*]\s*(?P<code>[A-Z]{2,6}\s*\d{1,4}[A-Z]?)\s*[—–-]\s*"
    r"(?P<title>[^|]+?)\s*\|\s*LEC\s+\d+\s+LAB\s+\d+\s+Units\s+(?P<units>\d+)"
    r"(?:\s*\|\s*(?:Prereq|Prerequisite|Prer\.?)\s*:\s*(?P<prerequisites>.*?))?\s*$",
    re.I,
)
CURRICULUM_SECTION = re.compile(
    r"^\s*(?P<year>(?:First|Second|Third|Fourth)\s+Year)\s*[—–-]\s*"
    r"(?P<term>(?:First|Second|Third)\s+Trimester)\s*:?\s*$",
    re.I,
)


CURRICULUM_SOURCES = {
    "curriculum_BEED_2024.txt": ("beed", "elementary education", "bachelor of elementary education"),
    "curriculum_BSCrim_2026.txt": ("bscrim", "bscriminology", "bs crim", "criminology"),
    "curriculum_BSCS_2024.txt": ("bscs", "bs cs", "computer science", "bachelor of science in computer science"),
    "curriculum_BSMA_2026.txt": ("bsma", "multimedia arts", "multimedia art"),
    "curriculum_BSOA_2024.txt": ("bsoa", "office administration", "office admin"),
    "curriculum_BSEd-Eng_2024.txt": ("bsed eng", "bsed english", "secondary education english", "secondary education major in english"),
    "curriculum_BSEd-Math_2024.txt": ("bsed math", "secondary education mathematics", "secondary education major in mathematics"),
    "curriculum_BSEd-Fil-2024_2024.txt": ("bsed filipino 2024", "bsed fil 2024", "secondary education filipino 2024"),
    "curriculum_BSEd-Fil-2026_2026.txt": ("bsed filipino 2026", "bsed fil 2026", "secondary education filipino 2026"),
}

CURRICULUM_TERMS = (
    "curriculum", "subject", "subjects", "course", "courses", "course sequence", "courses offered",
    "class list", "kurso", "asignatura", "aralin", "mga klase", "mga subject", "dagiti subject",
    "subjects ko", "subject ko", "subject nako", "subjects nako", "subjects ko ha", "mga subject sang",
    "subjects sang", "subjects han", "mga subject ha", "subject ko ha", "subjects nako sa",
    "prerequisite", "prereq", "course code", "course unit", "units", "trimester", "semester",
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
)


def normalize_query(text: str) -> str:
    folded = unicodedata.normalize("NFKD", (text or "").casefold())
    ascii_folded = "".join(char for char in folded if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", ascii_folded).strip()


def is_curriculum_query(text: str) -> bool:
    normalized = normalize_query(text)
    return any(term in normalized for term in CURRICULUM_TERMS)


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
    if not is_curriculum_follow_up(text):
        return None, False
    for item in reversed(history or []):
        if item.get("role") != "user":
            continue
        source = resolve_curriculum_source(item.get("content", ""))
        if source:
            return source, True
    return None, False


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
