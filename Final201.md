



Web-Based Student Information and Services Portal (SISP)

with a Hybrid NLP- and Semantic-Based Academic Advisory Chat System

for Regis Marie College

 









Presented to

COMPUTER STUDIES Faculty

Regis Marie College – Parañaque City, Philippines













In Partial Fulfillment

of the Requirements for the Degree

BACHELOR OF SCIENCE IN COMPUTER SCIENCE



















ABUCK, RAYNAN S.

DEMATERA, JOHN LESTER L.

SIMON, JIRO JAMES 





April, 2026







	





APPROVAL SHEET





In partial fulfillment of the requirements for the Degree of BACHELOR OF SCIENCE IN COMPUTER SCIENCE, this research titled, “Web-Based Student Information and Services Portal (SISP) with a Hybrid NLP- and Semantic-Based Academic Advisory Chat System for Regis Marie College” has been prepared and submitted by Raynan S. Abuck, John Lester L. Dematera, Jiro James Simon





JOHN M. MURILLO, CpE, MSCS

Adviser





Approved by the Committee on ORAL Examination with the Grade of _______.













JOFRANCIS C. GREGORIO			KIMBERLY M. NERBES, CpE

Panel Member				          Panel Member











MELISSA T. GUILLERMO, CpE, MSCS

        Panel Member







Accepted and approved in partial fulfillment of the requirements for the degree of Bachelor of Science in Computer Science.







	JUSTINE JOY C. ARENAJO

	College Dean





















Chapter 1

Introduction

The rapid advancement of digital technologies has significantly changed how educational institutions manage administrative functions and deliver academic services. Across higher education institutions worldwide, integrated digital platforms have become increasingly important in improving operational efficiency and enhancing student experience (Kuhail et al., 2023).

In the Philippines, however, this transition remains uneven, particularly among smaller private colleges that still rely on manual or semi-manual processes for managing student records, processing enrollment transactions, and providing academic advising. These traditional methods often result in delays, data duplication, limited accessibility, and increased risk of human error, which affect the quality and efficiency of student support services (World Bank, 2022).

In response to these challenges, this study proposes the development of a Web-Based Student Information and Services Portal (SISP) integrated with an AI-powered Academic Advisory Chat System for Regis Marie College. The proposed system aims to centralize student records management, streamline enrollment-related services, and provide timely academic guidance through a secure and accessible online platform.



        Project Context

Regis Marie College, like many higher education institutions, relies on administrative systems to manage student records, enrollment processes, and academic advising services. In today's digital environment, efficient and accessible information systems play a critical role in ensuring the accuracy of academic data, improving service delivery, and supporting student success. However, institutions that continue to rely on manual or semi-digital processes often encounter operational inefficiencies and limitations in service accessibility.

This study is conducted at Regis Marie College, a small private higher education institution located in Parañaque City, Philippines. The institution currently manages its core academic services — including student records management, enrollment processing, service request handling, and academic advising — through predominantly manual and paper-based workflows. The absence of a centralized digital platform means that these functions operate independently across multiple offices, with limited coordination and no unified system for tracking student data or transactions.

Student Records Management. Academic records at Regis Marie College are maintained across separate digital files — primarily Microsoft Excel spreadsheets — managed individually by the registrar, accounting, and academics departments. Each department maintains its own copy of student data relevant to its function, with no automated synchronization between files. Grade records are encoded manually by faculty after each grading period and submitted to the registrar, where they are recorded into department-level spreadsheets. Enrollment history and curriculum progress are similarly maintained on a per-department basis, with no single source of truth for a student's complete academic standing. This decentralized structure means that retrieving a student's complete academic profile requires coordinating across multiple offices and reconciling data from separate files — a process that is both time-consuming and susceptible to inconsistencies arising from encoding errors or version discrepancies between departmental records.

Enrollment and Service Request Processing. The enrollment process at Regis Marie College is conducted on a per-semester basis and requires students to physically visit multiple offices to complete their transactions. A typical enrollment cycle involves visiting the registrar's office to verify academic standing, the accounting office to settle financial obligations, and the academic department to finalize subject loads — each step requiring a separate transaction and physical document. Students who require academic documents such as official transcripts, enrollment certificates, or certification letters must similarly submit requests in person at the registrar's office. Processing time for document requests averages two to three business days, during which students have no mechanism for tracking the status of their request beyond returning to the office for a follow-up. During peak enrollment periods, the volume of simultaneous transactions leads to extended queuing and delays that affect both students and administrative staff.

Academic Advising. Academic advising at Regis Marie College is conducted through scheduled, face-to-face consultations between students and their designated faculty advisers. Advising availability is limited to approximately two hours per week per adviser, meaning that students who require guidance outside of these scheduled sessions have no institutional mechanism for obtaining timely academic support. Queries about prerequisite requirements, curriculum progress, subject loads, or academic policies outside of advising hours are typically directed to faculty via informal channels such as text messaging or email — channels that are not formally monitored and that vary in response time. There is no system that allows students to independently verify their own curriculum progress or check whether they meet the prerequisites for a given subject without consulting a faculty member or visiting an office.

Preliminary Assessment. A preliminary assessment of the current system identified the following specific operational conditions: students require one to three physical office visits per enrollment period to complete transactions; the average processing time for document requests is two to three business days; academic records are maintained in separate Excel files per department with no centralized integration; there is no system for tracking student curriculum progress in real time; and academic advising is limited to scheduled consultation hours of approximately two hours per week per adviser.

The existing system presents several operational challenges that affect both administrative efficiency and student experience. These challenges highlight the need for a more integrated and accessible solution.

The key issues identified in the current system are as follows:

Student academic records are maintained across separate departmental files without a centralized system, which may result in data discrepancies between offices, reduce the reliability of consolidated academic information, and leave records at risk of misplacement, deterioration, and access by unauthorized individuals in the absence of formal access control mechanisms.

Enrollment transactions and service request processing involve multiple sequential steps across different offices, which may result in increased wait times — particularly during peak enrollment periods — and place a higher workload on administrative staff.

Administrative transactions and service requests currently require students to be physically present during office hours, limiting access for students who are unable to visit the campus within scheduled operating times.

Academic advising is available only during scheduled consultation hours, limiting the availability of timely academic guidance for students who require assistance outside those periods.

The current system does not provide real-time data on enrollment activity, service request statuses, or student academic progress, making it difficult for the institution to monitor operational performance and evaluate service effectiveness on an ongoing basis.

These challenges are consistent with conditions observed in Philippine higher education institutions, where limited digital infrastructure and resource constraints hinder the adoption of fully integrated information systems (World Bank, 2022). Such limitations negatively impact both administrative processes and students' ability to access essential academic services efficiently.

Despite the increasing adoption of digital systems in higher education, many small private institutions in the Philippines continue to rely on fragmented and manual processes, particularly in student records management and academic advising. Existing studies emphasize the potential of AI-supported advisory systems; however, there is limited implementation of hybrid NLP and retrieval-based advisory systems tailored to institution-specific academic data in local contexts. This study addresses this gap by developing a system that integrates structured institutional data with AI-driven advisory support within a single operational platform.



Conceptual Framework

The study is guided by the Input-Process-Output (IPO) Model as its conceptual framework, which illustrates how institutional data and user inputs are transformed into system outputs. The IPO model was selected because it maps cleanly to the data flow of an information systems development study, allowing clear delineation between what enters the system, how it is handled, and what is produced. Inputs include student, faculty, and institutional data, as well as user queries. These inputs are processed by core system functionalities such as data management, access control, and query handling. The outputs consist of accessible student services, academic records, and advisory responses delivered through the portal.




Figure 1.1: Input-Process-Output (IPO) Model





Purpose and Description of the Project

The primary purpose of this study is to design, and develop a Web-Based Student Information and Services Portal (SISP) with a Hybrid NLP- and Semantic-Based Academic Advisory Chat System for Regis Marie College. The system is intended to serve as the institution's centralized digital platform for managing student records and delivering academic and administrative services.

The study addresses existing administrative inefficiencies and limited access to academic advising by providing an integrated solution that digitizes student records management, streamlines enrollment and service request processes, and enhances academic support through intelligent, on-demand guidance. By reducing reliance on paper-based transactions and manual verification, the system is designed to improve operational efficiency, data integrity, and service accessibility, which will be evaluated through system testing and user feedback during the study.

The portal will be accessible to four categories of users: students, faculty, academic advisers, and administrative staff. Each user type will be assigned role-specific functionalities and access controls aligned with institutional responsibilities. Students will be able to view academic records, monitor enrollment history, track curriculum progress, submit service requests, and interact with the academic advisory chat system. Faculty and academic advisers will access consolidated student data to support monitoring and advising activities, while administrative staff will manage records, process requests, and generate system usage reports.

A core feature of the system is the academic advisory chat component, which employs a hybrid intelligence approach combining Natural Language Processing (NLP)-based intent classification using scikit-learn and semantic vector search powered by pgvector. When a student submits a query, the system first identifies the intent and category of the inquiry. Simple or frequently asked questions are resolved using predefined response logic, while more complex queries are routed to the Groq API for large language model inference. In parallel, semantic retrieval using pgvector ensures that responses are grounded in contextually relevant institutional knowledge, improving accuracy and relevance (Akiba & Fraboni, 2023; Nguyen et al., 2025).

The system will be developed following secure software design principles and in compliance with the Data Privacy Act of 2012 (Republic Act No. 10173), ensuring that student records and institutional data are protected through role-based access control, secure data handling practices, and appropriate system safeguards throughout its operation.

Overall, this study aims to enhance academic service delivery at Regis Marie College by improving accessibility, reducing administrative workload, and providing students with a more efficient and intelligent academic support system.



Objectives of the Study

General Objective

To design and develop a Web-Based Student Information and Services Portal with a Hybrid NLP- and Semantic-Based Academic Advisory Chat System for Regis Marie College that addresses the limitations of the current manual processes. The system aims to improve data integrity, reduce processing delays, enhance accessibility, strengthen data security, and provide intelligent, on-demand academic advisory support for students, faculty, and administrative staff.

Specific Objectives

To architect and deploy a centralized, role-based Web Portal and Administrative Dashboard that integrates disparate departmental student records into a unified database; this system must enforce multi-factor authentication (MFA) and strict Role-Based Access Control (RBAC) to ensure zero unauthorized data modifications, while simultaneously generating real-time, automated analytics reports on enrollment velocity, service bottlenecks, and student academic progression metrics.

To engineer a fully automated, cloud-based enrollment and service request engine that reduces sequential administrative processing steps by at least 40%, thereby cutting end-to-end transaction times and enabling students to securely submit requests and complete transactions asynchronously from any location, 24/7, without requiring physical presence or staff intervention.

To develop and train a context-aware, AI-powered academic advisory chatbot integrated directly into the portal, utilizing a retrieval-augmented generation (RAG) model trained on institutional curriculum guidelines to instantly resolve student inquiries regarding course prerequisites, graduation requirements, and academic schedules outside of standard faculty consultation hours.

Problem–Objectives Mapping

The table below illustrates the direct relationship between the identified problems in the current system and the corresponding objectives of the study. Each objective is designed to address a specific issue, ensuring that the proposed system provides a comprehensive and targeted solution.

Table 1.1: Problem-Objective Mapping

Problem / Issue | Corresponding Objective
Academic records maintained in separate departmental files without centralized access control, creating risks of data discrepancy and unauthorized access  | Develop a centralized, role-based portal with integrated access control
Enrollment and service request processing involve multiple sequential steps, resulting in increased wait times during peak periods  | Streamline enrollment workflows and service request processing 
Administrative transactions require physical presence during office hours, limiting access for students outside those periods  | Provide remote, anytime web-based access to records and transactions 
Academic advising is available only during scheduled consultation hours  | Deploy an AI advisory chat system extending advising availability 
No real-time data on enrollment activity, service requests, or student progress for institutional monitoring  | Develop a real-time administrative dashboard and reporting mechanism 
Lack of monitoring and evaluation tools  | Develop dashboard and evaluation tools 



Significance of the Study

The proposed system is expected to provide significant benefits to various stakeholders within and beyond Regis Marie College. This study highlights the value of integrating digital technologies and intelligent systems in improving academic service delivery and institutional efficiency.

Students will be the primary beneficiaries of the system. The availability of a centralized, web-based platform allows them to conveniently access academic records, monitor enrollment status, and submit service requests without the need for repeated office visits. This accessibility enables faster transactions and more efficient management of academic requirements. Additionally, the integrated academic advisory chat system provides timely and accurate responses to student inquiries, supporting better academic decision-making and increasing confidence in navigating curriculum requirements. Studies have shown that AI-supported advisory tools improve access to academic support and enhance student engagement (Akiba & Fraboni, 2023).

Faculty and Academic Advisers will benefit from improved access to consolidated and up-to-date student academic data, enabling more effective monitoring of student progress and early identification of those who may require intervention. The reduction of repetitive inquiries through the chat system allows faculty to focus on higher-level advising tasks and instructional responsibilities. Prior research indicates that educational chatbots can significantly reduce faculty workload while maintaining high levels of student satisfaction (Labadze et al., 2023; Okonkwo & Ade-Ibijola, 2021).

Administrative Personnel will experience increased efficiency in managing student records and processing service requests through system automation. The availability of real-time data through the administrative dashboard supports more informed and timely decision-making. This contributes to improved operational performance and reduces reliance on manual processes, which are often prone to delays and errors. The adoption of digital administrative systems has been widely recognized as a key factor in enhancing institutional efficiency in higher education (World Bank, 2022; OECD, 2023).

Regis Marie College as an institution will benefit from the modernization of its academic service infrastructure. By adopting an integrated and intelligent system, the institution can improve service quality, increase student satisfaction, and support data-driven decision-making. These improvements contribute to a more efficient academic environment and strengthen the institution's capability to adapt to ongoing digital transformation in higher education.

Future Researchers will benefit from this study as it provides a practical design of a hybrid NLP- and semantic-based academic advisory system within the Philippine higher education context. The study can serve as a reference for further research in educational technology, intelligent systems, and AI-driven student support services.



Scope and Limitation

Scope 

Secure online access to student academic records including a centralized portal for real-time viewing of cumulative grades, semantic enrollment history, and term-by-term progress, alongside a dynamic curriculum tracker that maps completed courses against program checklists to highlight remaining prerequisites and graduation requirements. Online submission and real-time tracking of service requests for academic documents such as transcripts of records (TOR) and certifications, enabling students to remotely submit requests independent of office hours through a streamlined administrative workflow. A hybrid NLP- and semantic-based academic advisory chat system utilizing an intent-classification engine to analyze student inquiries regarding academic rules and scheduling, backed by a context-aware knowledge base that delivers 24/7 automated advisory support on course prerequisites and institutional policies. An administrative dashboard for monitoring high-level enrollment analytics pipelines, active registration trends, student academic performance trends, and system usage metrics. Role-based access controls and JWT-based authentication to ensure secure, stateless session management, enforcing strict data isolation and access permissions tailored to the four system roles to fully safeguard data integrity in compliance with the Data Privacy Act of 2012. 

The system will be developed using a web-based full-stack architecture that supports frontend, backend, and machine learning components. It will be deployed as an online platform accessible through standard web browsers.



Limitations

While the system aims to comprehensively improve academic service delivery at Regis Marie College, several limitations must be acknowledged due to technical, administrative, and resource constraints. The chatbot responses are limited to the uploaded institutional knowledge base: The advisory chat system cannot answer inquiries or interpret policies outside of the explicitly uploaded institutional knowledge base and pre-configured academic rules. Chat system performance dependency: The chat system cannot dynamically update its own machine learning models, expand its dataset automatically post-deployment, or learn from real-time user interactions. Cannot override or replace human discretion: The system cannot act as a final authority or substitute for official academic advisers when dealing with exceptional student cases, complex scholastic appeals, or situations requiring nuanced human judgment. System performance variability: The portal cannot maintain uniform processing speeds or guarantee peak performance during periods of high simultaneous user traffic, as system responsiveness remains strictly dependent on allocated physical server resources. 



Definition of Terms

The following terms are defined as they are used in this study. Terms are arranged alphabetically under technical and operational categories. The definitions are operational in nature and describe how each term applies within the context of the proposed system.



Technical Terms

Academic Advisory Chat System. In this study, this refers to the AI-powered chat feature integrated into the portal that responds to student academic concerns using intent classification, semantic search, and large language model support for complex queries.

FastAPI. In this study, this refers to the Python-based web framework used to develop the machine learning and natural language processing service layer connected to the main system backend.

Groq API. In this study, this refers to the application programming interface used to process complex student queries that require advanced contextual response generation.

Hybrid NLP- and Semantic-Based Approach. In this study, this refers to the combined method of using natural language processing for intent detection and semantic search for retrieving relevant academic information before generating responses.

Intent Classification. In this study, this refers to the machine learning process of identifying the purpose of a student query and routing it to the appropriate response mechanism of the chat system.

JSON Web Token (JWT). In this study, this refers to the authentication method used to securely verify user identity and manage login sessions within the portal.

Natural Language Processing (NLP). In this study, this refers to the branch of artificial intelligence used to enable the system to understand, classify, and process student questions written in natural language.

NestJS. In this study, this refers to the Node.js framework used to structure and manage the backend services of the portal.

Next.js. In this study, this refers to the React-based framework used to develop the frontend interface of the portal.

pgvector. In this study, this refers to the PostgreSQL extension used to store and search vector data for semantic matching between student queries and institutional content.

PostgreSQL. In this study, this refers to the relational database management system used to store student records, enrollment data, service requests, and other system information.

Prisma ORM. In this study, this refers to the database management tool used to simplify communication between the backend system and the PostgreSQL database.

Retrieval-Augmented Generation (RAG). In this study, this refers to the AI method of retrieving relevant institutional data first before generating responses to improve accuracy and relevance.

scikit-learn. In this study, this refers to the machine learning library used to develop and train the intent classification model of the chat system.

Semantic Vector Search. In this study, this refers to the search method used to find related content by comparing the meaning of student queries with stored institutional information.

Zustand. In this study, this refers to the state management library used to control and maintain frontend data states within the portal.

Operational Terms

Academic Records. In this study, this refers to the student information maintained by the institution, including grades, enrollment history, curriculum progress, and course completion status, accessible to authorized users through the portal.

Administrative Dashboard. In this study, this refers to the portal interface used by authorized staff to monitor enrollment summaries, student performance data, request statuses, and system activity in real time.

Curriculum Tracking. In this study, this refers to the system feature that monitors a student's academic progress based on completed, ongoing, and remaining subjects, including overall completion status.

Knowledge Base. In this study, this refers to the collection of institutional documents, policies, curriculum guides, and advising information used by the academic advisory chat system to generate accurate responses.

Service Request. In this study, this refers to an online request submitted by a student for documents or certifications such as transcripts, enrollment certificates, or similar academic records, with a trackable processing status.

Student Information and Services Portal (SISP). In this study, this refers to the web-based system developed for Regis Marie College that integrates student records management, enrollment services, request processing, and academic advisory support in one platform.

User Roles. In this study, this refers to the four categories of authorized users of the system, namely students, faculty, academic advisers, and administrative staff, each assigned specific access rights and functions.

Conclusion

This chapter established the foundation for the study by presenting the problem context and justification for developing a Web-Based Student Information and Services Portal with an AI-powered Academic Advisory Chat System for Regis Marie College. The existing manual processes create inefficiencies in student records management, enrollment processing, and academic advising that this study aims to address through a centralized, digital solution.

The identified problems—data inconsistencies, manual enrollment bottlenecks, limited accessibility, weak data security, and restricted access to academic advising—provide clear justification for the system proposed in this study. The Research Gap section highlights the absence of affordable, integrated solutions that combine records management with AI-powered advisory support specifically designed for small Philippine higher education institutions.

Chapter 2 will present the related literature and studies that guide the system's design, while Chapter 3 will detail the methodology for developing and evaluating the proposed SISP. The objectives outlined in this chapter serve as measurable milestones for determining the success of the system upon testing.


References 

Akiba, D., & Fraboni, M. C. (2023). AI-supported academic advising: Exploring ChatGPT's current state and future potential toward student empowerment. Education Sciences, 13(9), 885. https://doi.org/10.3390/educsci13090885

Assayed, S., Shaalan, K., & Alkhatib, M. (2023). A chatbot intent classifier for supporting high school students. EAI Endorsed Transactions on Scalable Information Systems, 10(3), 1. https://doi.org/10.4108/eetsis.v10i2.2948

Kuhail, M. A., Alturki, N., Alramlawi, S., & Alhejori, K. (2023). Interacting with educational chatbots: A systematic review. Education and Information Technologies, 28, 973–1018. https://doi.org/10.1007/s10639-022-11177-3

Labadze, L., Grigolia, M., & Machaidze, L. (2023). Role of AI chatbots in education: Systematic literature review. International Journal of Educational Technology in Higher Education, 20, 56. https://doi.org/10.1186/s41239-023-00426-1

Nguyen, D. D. K., Mach, V. K., Le Dinh, T., & Pham-Nguyen, C. (2025). Integrating information retrieval and LLMs: A document retrieval chatbot in education settings. In N. Thai-Nghe, T. N. Do, & S. Benferhat (Eds.), Intelligent Systems and Data Science. ISDS 2025. Communications in Computer and Information Science (Vol. 2714). Springer. https://doi.org/10.1007/978-981-95-3358-9_33

OECD. (2023). Digital education outlook 2023: Towards an effective digital education ecosystem. OECD Publishing. https://doi.org/10.1787/c74f03de-en

Okonkwo, C. W., & Ade-Ibijola, A. (2021). Chatbots applications in education: A systematic review. Computers and Education: Artificial Intelligence, 2, 100033. https://doi.org/10.1016/j.caeai.2021.100033

World Bank. (2022). Digital transformation of Philippine higher education (Report No. AUS0002964). World Bank Group. https://documents1.worldbank.org/curated/en/099925001062333685/pdf/P17757402843a10c90b3e30308406a38304.pdf

CHAPTER 2

REVIEW OF RELATED LITERATURE AND STUDIES

This chapter presents a review of related literature and studies relevant to the development of the Web-Based Student Information and Services Portal (SISP) with a Hybrid NLP- and Semantic-Based Academic Advisory Chat System for Regis Marie College. The review draws from peer-reviewed journal articles, institutional and government reports, and credible academic sources, with emphasis on publications from 2021 onward. Sources are analyzed and synthesized — not merely summarized — to establish the academic and technical foundation of this study, identify existing research gaps, and support the rationale for developing an integrated web-based platform with intelligent academic advisory support.

This chapter is organized into the following sections: foreign literature, foreign studies, local literature, local studies, technical background, related systems, and a synthesis of the reviewed literature. This structure ensures a clear distinction between internationally published works and locally grounded research, as well as between conceptual literature and empirical studies.



Foreign Literature

Digital Transformation in Higher Education

The digitization of academic and administrative processes has become a defining feature of modern higher education institutions worldwide. UNESCO (2023) reported that digital technologies, when implemented thoughtfully, may improve access, institutional efficiency, and responsiveness in education. However, the same report acknowledged that many institutions — particularly those with limited resources — continue to encounter fragmented systems, inadequate infrastructure, and the absence of integration across administrative functions. Similarly, the OECD (2023) indicated that connected digital ecosystems in education may contribute to improved data-driven decision-making, service delivery, and learner support when institutional systems are appropriately unified.



These observations suggest that while the global consensus on the value of digital integration in higher education is well-established, the practical conditions necessary for successful adoption — particularly in resource-constrained environments — remain unevenly met. This gap between recognized benefit and institutional readiness is relevant to the context of Regis Marie College, where digital adoption remains limited by resource and infrastructure constraints.



Student Information Systems and Web Portals

Student Information Systems (SIS) are platforms designed to manage academic records, enrollment history, grades, schedules, and administrative transactions. Modern implementations often include self-service web portals that allow students to access services independently, without repeated office visits. Educause (2022) found that student-centered digital portals may improve user satisfaction by enabling self-service access to institutional resources, reducing repetitive office inquiries, and shortening turnaround times for common administrative requests.



UNESCO (2023) further indicated that accessible digital systems may contribute to improved service continuity and reduced institutional dependence on paper-based workflows. These findings collectively suggest that self-service student portals represent a feasible approach to addressing common institutional inefficiencies — including those currently observed at Regis Marie College — though their effectiveness is contingent on appropriate design for the intended user population and institutional context.



Artificial Intelligence in Education

Artificial intelligence has become increasingly relevant in higher education, particularly in areas such as personalized learning, student support, and administrative automation. Kasneci et al. (2023) conducted a broad analysis of large language models in educational contexts and identified considerable potential in personalized guidance, automated question answering, and the reduction of repetitive administrative tasks. However, the authors equally cautioned that AI tools in education require grounding in verified institutional data and appropriate human oversight to reduce the risk of factual inaccuracy.



Tlili et al. (2023) offered a complementary perspective, finding that AI chat systems may improve accessibility and learner support when deployed responsibly and with appropriate institutional boundaries. Their analysis suggests that bounded, institution-specific AI deployment may be more appropriate in educational settings than unconstrained general-purpose chatbot use. Together, these works indicate that the responsible integration of AI in academic service delivery requires deliberate design constraints — a principle that informs the scope and architecture of the proposed system.



Chatbots in Educational Services

Chatbots have become one of the most practically deployed forms of AI in educational institutions, particularly for student helpdesks, FAQ resolution, and academic advising support. Okonkwo and Ade-Ibijola (2021) conducted a systematic review of chatbot applications in education and found that educational chatbots generally improve student engagement, expand support availability beyond office hours, and tend to reduce staff workload by handling repetitive inquiries. Their review further noted that chatbots are particularly useful in contexts where students need timely, on-demand access to institutional information.



Labadze et al. (2023) similarly concluded in a systematic literature review that AI chatbots in higher education may enhance responsiveness and user satisfaction, particularly where human advising capacity is limited. Importantly, the authors also noted that chatbot effectiveness is strongly influenced by the quality and specificity of its underlying knowledge base. These findings suggest that educational chatbots may offer meaningful improvements in student support when their responses are grounded in verified, institution-specific content — a principle relevant to the design of the proposed academic advisory chat system.



Data Privacy and Security in Information Systems

The protection of personal data in educational information systems is a recognized obligation across international standards. The National Institute of Standards and Technology (2020) recommends a comprehensive set of security and privacy controls for information systems — including strong authentication mechanisms, least-privilege access principles, data encryption, and continuous system monitoring. These controls are intended to reduce the risk of unauthorized access, data loss, and system compromise in environments that handle sensitive personal records.



This framework is relevant to the proposed portal, which will manage student academic records, enrollment data, and service request information. The adoption of security controls consistent with recognized international standards may contribute to the integrity and trustworthiness of the system — particularly in an institutional environment where data is currently managed through paper-based and unstructured digital files with limited access controls.



Foreign Studies

Studies on AI-Supported Academic Advising

Akiba and Fraboni (2023) examined the use of AI-supported tools in academic advising contexts and found that students who engaged with AI-assisted advisory systems reported improved access to academic information and greater confidence in navigating curriculum requirements. Their study explored the potential of large language models as advising aids and noted that while AI cannot replace professional advisers for complex decisions, it may serve as a practical first point of contact for routine academic queries — an observation that is consistent with the role envisioned for the proposed system's advisory chat component.



Bilquise et al. (2022) developed and evaluated a bilingual AI-driven chatbot for academic advising and found that students reported higher satisfaction and confidence when using the chatbot compared to waiting for scheduled advising sessions. Their evaluation indicated that on-demand advisory access, even through an automated system, may produce measurable improvements in student experience. While the study focused on a bilingual deployment context, its findings on the value of accessible, automated advisory support are relevant to resource-constrained institutions where scheduled advising hours are limited.



Studies on Chatbot Intent Classification

Assayed et al. (2023) specifically examined intent classification in educational chatbot contexts and found that machine learning-based classifiers can achieve reliable categorization of student queries when trained on domain-specific data. Their study demonstrated that supervised classification approaches may be a feasible basis for routing student queries in institution-specific advisory systems, particularly when training data reflects the actual range of inquiries submitted by the target student population. These findings suggest that NLP-based intent classification, when trained on relevant institutional data, may contribute to more accurate and context-sensitive query handling in educational chatbot applications.



Studies on Retrieval-Augmented Generation in Education

Lewis et al. (2020) introduced Retrieval-Augmented Generation (RAG), a method in which a language model first retrieves relevant source documents before generating a response. Their study found that this approach may improve factual accuracy and contextual relevance by grounding generated answers in verified content, rather than relying solely on parameters learned during model training. Khattab and Zaharia (2020) further demonstrated through the ColBERT model that contextualized semantic retrieval systems may outperform keyword-based approaches for domain-specific queries where surface-level phrasing varies but semantic intent remains consistent.



Nguyen et al. (2026) provided a directly relevant precedent in educational settings, finding that a document retrieval chatbot combining semantic retrieval with language model inference can address institution-specific academic queries with contextual relevance. Their study evaluated a RAG-based chatbot deployed for student use and found that grounding responses in institutional documents contributed to improved response appropriateness compared to generation-only approaches. These findings collectively suggest that retrieval-augmented approaches may serve as a viable technical basis for domain-specific academic advisory systems.



Studies on Large Language Models in Education

Kasneci et al. (2023) examined the opportunities and challenges of large language models — particularly ChatGPT — in educational contexts. Their study found that while LLMs offer considerable potential for personalized guidance, question answering, and reducing repetitive administrative tasks, they also carry significant risks of generating factually incorrect responses when not constrained by verified knowledge sources. The authors recommended that AI tools in education be implemented with appropriate safeguards, including human oversight and grounding in institutional data.



Tlili et al. (2023) offered a similarly measured assessment, finding that chatbot technologies may improve access to educational assistance but require careful scope management to avoid misuse or over-reliance. Their study highlighted the importance of defining clear operational boundaries for educational chatbots — a finding that supports the proposed system's design of limiting advisory responses to Regis Marie College's own verified institutional content and referring exceptional cases to faculty advisers.



Local Literature

Philippine Policy on Digital Education

The Commission on Higher Education (CHED, 2021), through its memorandum on sustaining flexible learning in higher education, directed all Philippine higher education institutions to explore and integrate digital modalities into their academic service delivery. This policy direction reflects the national government's recognition that digital platforms are essential to maintaining educational continuity and improving institutional efficiency — particularly in response to the challenges exposed by the COVID-19 pandemic. The memorandum indicates that the shift toward digital academic services is not merely encouraged but formally expected of Philippine HEIs, regardless of institutional size or resource level.



This policy context provides an institutional and regulatory basis for the proposed SISP. The development of a web-based portal with integrated academic advisory support at Regis Marie College aligns with CHED's (2021) directive and may be understood as a concrete institutional response to the national policy expectation that all higher education institutions modernize their service delivery through digital means.



Data Privacy Legislation in Philippine Educational Institutions

Republic Act No. 10173, known as the Data Privacy Act of 2012, establishes the legal framework for the protection of personal data in the Philippines (Philippines National Privacy Commission, 2012). The law requires all organizations that collect, store, and process personal information — including educational institutions — to implement lawful data practices, enforce access controls, and maintain secure handling of personal records. Non-compliance carries legal consequences, including administrative sanctions and criminal liability for data protection officers.



For the proposed portal, which will manage student academic records, enrollment information, and service request data, compliance with RA 10173 is not optional but legally mandated. The law's requirements for access control, data minimization, and secure storage are directly reflected in the proposed system's security design — including role-based access restrictions and secure authentication mechanisms — and provide the legal foundation for the data protection features incorporated into the portal.



Digital Transformation Challenges in Philippine Higher Education

The World Bank (2022) documented the specific conditions shaping digital transformation in Philippine higher education, finding that smaller private institutions face compounded barriers including limited funding, insufficient technical capacity, and the absence of affordable, locally appropriate digital solutions. The report indicated that while national policy encourages digitalization, the gap between policy direction and institutional capacity remains particularly pronounced among smaller colleges — many of which continue to operate core academic services through manual and paper-based processes.



These findings are directly relevant to Regis Marie College, which operates in the institutional profile described by the World Bank (2022) report. The report's characterization of the barriers facing small Philippine private colleges reinforces the need for a solution that is affordable, locally contextualized, and designed for institutions with limited IT infrastructure — design priorities that are reflected in the proposed system's development approach.



Local Studies

Student Engagement with Digital Academic Platforms in the Philippines

Ong et al. (2021) conducted a study examining factors that influenced the use of learning management systems among Filipino higher education students during the COVID-19 pandemic. Their findings indicated that perceived usefulness and ease of use were among the strongest predictors of student engagement with digital academic platforms. Students were more likely to consistently engage with institutional technology systems when those systems were perceived as directly beneficial and straightforward to navigate — regardless of the student's prior technology experience.



These findings carry practical implications for the design of the proposed SISP. They suggest that a student portal's adoption within a Philippine higher education context depends not only on the availability of the system but on whether students perceive it as genuinely useful and easy to use. This reinforces the importance of developing an interface that clearly communicates its benefits, minimizes complexity, and is responsive to the needs and expectations of Regis Marie College's student population.



Data Privacy Act Implementation Among Philippine Higher Education Institutions

Castro (2021) conducted a study assessing the implementation of Republic Act No. 10173 across ten higher education institutions in the Province of Pangasinan. The study found that compliance with the Data Privacy Act remained moderate among the institutions examined, with data breach notification procedures and access control mechanisms identified as the most commonly deficient areas. Many institutions had designated data protection officers and adopted basic privacy policies, but gaps in technical implementation — particularly in controlling access to digital records — were widely noted.



Castro's (2021) findings are significant for the proposed study in two respects. First, they provide locally grounded evidence that data privacy compliance in Philippine HEIs — especially smaller ones — cannot be assumed to be in place and must be deliberately designed into any new information system. Second, they identify access control as a specific area of weakness, which reinforces the importance of embedding role-based access restrictions into the proposed portal's architecture from the design stage rather than treating security as a secondary implementation concern.



Technical Background

Natural Language Processing and Intent Classification

Natural Language Processing (NLP) is a subfield of artificial intelligence that enables computational systems to understand, interpret, and generate human language. Within conversational AI systems, one of the most practically significant NLP tasks is intent classification — the process of identifying the category or purpose of a user's input so that the system can route it to the appropriate response mechanism. Jurafsky and Martin (2023) described intent classification as a foundational task in spoken and written dialogue systems, noting that accurate intent recognition is a prerequisite for meaningful and context-appropriate system responses.



In educational chatbot contexts, intent classification determines whether a student's query pertains to enrollment procedures, curriculum requirements, grading policies, service requests, or other categories of institutional concern. Assayed et al. (2023) demonstrated that supervised machine learning classifiers trained on domain-specific educational data can achieve reliable query categorization — a finding that supports the feasibility of applying intent classification as the first processing stage in an academic advisory system. The effectiveness of such classifiers is understood to depend substantially on the representativeness and completeness of the training data used.



Semantic Search and Retrieval-Augmented Generation

Semantic search refers to a class of information retrieval techniques that identify relevant content based on the meaning and context of a query rather than the presence of specific keywords. This is achieved by representing queries and documents as high-dimensional numerical vectors — called embeddings — and measuring their similarity in vector space. Unlike keyword-based search, which fails when users phrase queries differently from how information is stored, semantic search can surface contextually relevant content even when the exact terminology differs between the query and the source document.



Lewis et al. (2020) introduced Retrieval-Augmented Generation (RAG) as a method that combines semantic retrieval with language model generation. In a RAG architecture, a system first retrieves a set of relevant documents from a knowledge base using semantic search, then uses those documents as context when generating a response. This grounding mechanism may reduce the tendency of language models to generate plausible but factually unsupported outputs — a risk identified by Kasneci et al. (2023) in the context of educational AI deployments. Khattab and Zaharia (2020) further contributed to this area by demonstrating that contextualized late-interaction retrieval models can improve the precision of document retrieval for domain-specific queries, supporting the use of semantic retrieval in specialized knowledge domains such as institutional academic content.



Web-Based Student Information Systems



A Student Information System (SIS) is a software platform that centralizes the management of academic and administrative data for an educational institution. Core functions of a modern SIS typically include student records management, enrollment processing, grade tracking, curriculum monitoring, service request handling, and reporting. Educause (2022) noted that institutions that implement web-based SIS platforms with student self-service functionality tend to report reductions in administrative transaction time and improvements in student satisfaction with institutional services.



Modern SIS implementations are typically built on full-stack web architectures that separate frontend user interfaces, backend application logic, and database management layers. This modular approach supports scalability, role-based access control, and secure data handling — features that are particularly important in academic environments where different categories of users require different levels of data access. The proposed SISP adopts this architectural approach, integrating student records management, service request processing, and AI-powered advisory support within a unified, role-differentiated web platform.



Role-Based Access Control and Authentication

Role-based access control (RBAC) is a security model in which system permissions are assigned based on a user's defined role within an organization rather than on an individual user basis. In educational information systems, RBAC ensures that students, faculty, academic advisers, and administrative staff each access only the data and functions relevant to their institutional responsibilities — reducing the risk of unauthorized data exposure or modification. The National Institute of Standards and Technology (2020) identifies RBAC as a recommended security control for information systems that handle sensitive personal data, noting that least-privilege access principles reduce the attack surface of the system and limit the potential impact of security incidents.



In the context of the proposed portal, RBAC is implemented in combination with token-based authentication mechanisms to verify user identity and maintain secure session management. These controls are designed to meet the access restriction requirements of Republic Act No. 10173 and to address the access control deficiencies identified by Castro (2021) in Philippine higher education institutions. Together, RBAC and secure authentication form the foundational security layer of the proposed system.



Related Systems

Edusuite

Edusuite serves as a comprehensive school management system designed to streamline the operational complexities of educational institutions. Its core strength lies in its integrated approach to institutional administration, specifically offering robust modules for finance and payment processing. By centralizing these critical functions, Edusuite reduces administrative overhead and provides clear financial visibility for school administrators. However, its focus remains largely on back-end management rather than student-centered interactive advisory support.



One STI Student Portal

The One STI Student Portal is a tailored solution developed specifically to enhance the student experience by providing a centralized digital gateway for academic and administrative inquiries. Its most notable feature is its real-time balance tracking, which empowers students to monitor their financial obligations without requiring manual intervention from the registrar's office. While highly effective as a transactional and informational hub, it functions primarily as a static portal for account management rather than an intelligent, conversational interface.



PUP SIS / PUP SINTA

The Polytechnic University of the Philippines (PUP) Student Information System (SIS) and the associated PUP SINTA platform represent institutional efforts toward digitizing student services. These systems are designed to handle high volumes of student inquiries and streamline processes like enrollment, grade viewing, and records requests. They provide a foundational level of inquiry support, serving as a critical infrastructure for student-institution interaction, though they typically rely on traditional query-based frameworks rather than AI-driven conversational guidance.



Benilde AI-Powered School Chatbot

The De La Salle-College of Saint Benilde (DLS-CSB) has implemented an AI-powered school chatbot that serves as a prime example of proactive student support. By leveraging natural language processing, this system is capable of understanding and responding to a variety of student queries, from campus directions to procedural inquiries. It stands out as one of the most practical and user-friendly implementations of AI in the Philippine higher education sector, setting a benchmark for conversational efficiency and availability.



UPOU Advanced Chatbot Ecosystem

The University of the Philippines Open University (UPOU) has developed an advanced chatbot ecosystem designed to address the unique needs of a distance-learning population. Unlike standard FAQ bots, this ecosystem is engineered for complex academic and student-support interactions, potentially guiding students through nuanced institutional policies and enrollment workflows. By integrating into the broader university framework, it serves as a highly scalable model for utilizing artificial intelligence to maintain high-touch student support in an open and distance-learning environment.



Synthesis

The reviewed foreign literature, foreign studies, local literature, local studies, and technical background collectively suggest a consistent and converging pattern: while digital tools for education — including student portals, AI chatbots, NLP-based systems, and semantic retrieval engines — have been associated with improvements in institutional efficiency and student support across various international contexts, their integrated deployment in smaller Philippine higher education institutions remains limited, fragmented, and largely underdeveloped.



From the foreign literature, UNESCO (2023), OECD (2023), and Educause (2022) establish that web-based student portals and integrated digital systems may contribute to improved service quality and institutional performance, while also acknowledging that adoption barriers persist in resource-constrained environments. Kasneci et al. (2023), Tlili et al. (2023), Okonkwo and Ade-Ibijola (2021), and Labadze et al. (2023) provide a consensus from the international literature that AI chatbots and language model tools may improve student access and satisfaction in academic advising — but only when appropriately grounded in verified institutional content and deployed with clear operational boundaries. NIST (2020) establishes the technical framework for secure information systems that underpins the proposed portal's security architecture.



From the foreign studies, Akiba and Fraboni (2023) and Bilquise et al. (2022) provide empirical support for the value of AI-assisted advising and on-demand advisory access. Assayed et al. (2023) demonstrate the feasibility of intent classification in educational chatbot contexts. Lewis et al. (2020), Khattab and Zaharia (2020), and Nguyen et al. (2026) collectively establish retrieval-augmented generation as an approach that may improve advisory response accuracy and contextual relevance in domain-specific educational settings. Kasneci et al. (2023) and Tlili et al. (2023) reinforce the importance of institutional grounding and scope limitations for AI tools deployed in education.



From the local literature, CHED (2021) and the World Bank (2022) indicate that national policy encourages digital integration in Philippine HEIs, yet a gap between policy direction and institutional capacity remains — particularly for small private colleges. Republic Act No. 10173 (Philippines National Privacy Commission, 2012) establishes the legal data privacy framework within which the proposed system must operate. From the local studies, Ong et al. (2021) provide Philippine-specific evidence that perceived usefulness and ease of use are critical predictors of student engagement with digital platforms, while Castro (2021) identifies access control and breach notification as specific compliance gaps in Philippine HEIs — both findings that directly inform the design priorities of the proposed SISP.



The technical background establishes that NLP-based intent classification, semantic vector retrieval, RAG architectures, role-based access control, and web-based SIS design each have documented precedents that support the feasibility of the proposed system's components. The related systems reviewed — PowerSchool, Schoology, Google Forms, and institutional custom portals — each address isolated aspects of institutional need without providing an integrated, intelligent, and locally appropriate solution.



A consistent gap across all reviewed sources is the absence of systems or studies that combine student records management, administrative service processing, and hybrid NLP- and semantic-based academic advisory support within a single, centralized platform specifically designed for the resource constraints and institutional context of smaller Philippine higher education institutions. This gap, supported by evidence across foreign and local literature and studies alike, provides the basis for the development of the Web-Based Student Information and Services Portal (SISP) with a Hybrid NLP- and Semantic-Based Academic Advisory Chat System for Regis Marie College.



References



Akiba, D., & Fraboni, M. C. (2023). AI-supported academic advising: Exploring ChatGPT's current state and future potential toward student empowerment. Education Sciences, 13(9), 885. https://doi.org/10.3390/educsci13090885



Assayed, S. K., Shaalan, K., & Alkhatib, M. (2023). A chatbot intent classifier for supporting high school students. EAI Endorsed Transactions on Scalable Information Systems, 10(3), e1. https://doi.org/10.4108/eetsis.2948



Bilquise, G., Ibrahim, S., & Shaalan, K. (2022). Bilingual AI-driven chatbot for academic advising. International Journal of Advanced Computer Science and Applications, 13(8), 50–57. https://doi.org/10.14569/IJACSA.2022.0130808



Castro, C. K. C. (2021). The implementation of the Data Privacy Act among higher educational institutions in the Province of Pangasinan. Asian Journal of Multidisciplinary Studies, 4(2), 103–111.



Commission on Higher Education. (2021). Memorandum: Sustaining flexible learning in higher education. CHED. https://ched.gov.ph/issuances



Educause. (2022). 2022 EDUCAUSE horizon report: Teaching and learning edition. EDUCAUSE. https://www.educause.edu/horizon-report-teaching-and-learning-2022



Jurafsky, D., & Martin, J. H. (2023). Speech and language processing (3rd ed. draft). Stanford University. https://web.stanford.edu/~jurafsky/slp3/



Kasneci, E., Sessler, K., Küchemann, S., Bannert, M., Dementieva, D., Fischer, F., Gasser, U., Groh, G., Günnemann, S., Hüllermeier, E., Krusche, S., Kutyniok, G., Michaeli, T., Nerdel, C., Pfeffer, J., Poquet, O., Sailer, M., Schmidt, A., Seidel, T., … Kasneci, G. (2023). ChatGPT for good? On opportunities and challenges of large language models for education. Learning and Individual Differences, 103, 102274. https://doi.org/10.1016/j.lindif.2023.102274



Khattab, O., & Zaharia, M. (2020). ColBERT: Efficient and effective passage search via contextualized late interaction over BERT. In Proceedings of the 43rd International ACM SIGIR Conference on Research and Development in Information Retrieval (pp. 39–48). https://doi.org/10.1145/3397271.3401075



Kuhail, M. A., Alturki, N., Alramlawi, S., & Alhejori, K. (2023). Interacting with educational chatbots: A systematic review. Education and Information Technologies, 28, 973–1018. https://doi.org/10.1007/s10639-022-11177-3



Labadze, L., Grigolia, M., & Machaidze, L. (2023). Role of AI chatbots in education: Systematic literature review. International Journal of Educational Technology in Higher Education, 20, 56. https://doi.org/10.1186/s41239-023-00426-1



Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Müller, H., Schulman, J., Chen, Y., Kiela, D., & others. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. Advances in Neural Information Processing Systems, 33, 9459–9474.



National Institute of Standards and Technology. (2020). Security and privacy controls for information systems and organizations (SP 800-53 Rev. 5). https://doi.org/10.6028/NIST.SP.800-53r5



Nguyen, D. D. K., Mach, V. K., Le Dinh, T., & Pham-Nguyen, C. (2026). Integrating information retrieval and LLMs: A document retrieval chatbot in education settings. In N. Thai-Nghe, T. N. Do, & S. Benferhat (Eds.), Intelligent Systems and Data Science. ISDS 2025. Communications in Computer and Information Science (Vol. 2714). Springer. https://doi.org/10.1007/978-981-95-3358-9_33



OECD. (2023). Digital education outlook 2023: Towards an effective digital education ecosystem. OECD Publishing. https://doi.org/10.1787/c74f03de-en



Okonkwo, C. W., & Ade-Ibijola, A. (2021). Chatbots applications in education: A systematic review. Computers and Education: Artificial Intelligence, 2, 100033. https://doi.org/10.1016/j.caeai.2021.100033



Ong, A. K. S., Prasetyo, Y. T., Young, M. N., Diaz, J. F., & Persada, S. F. (2021). Factors affecting the use of learning management system among Filipino higher education students during the COVID-19 pandemic. Applied System Innovation, 4(3), 62. https://doi.org/10.3390/asi4030062



Philippines National Privacy Commission. (2012). Republic Act No. 10173: Data Privacy Act of 2012. https://privacy.gov.ph/



Tlili, A., Shehata, B., Adarkwah, M. A., Bozkurt, A., Hickey, D. T., Huang, R., & Agyemang, B. (2023). What if the devil is my guardian angel: ChatGPT as a case study of using chatbots in education. Smart Learning Environments, 10, 15. https://doi.org/10.1186/s40561-023-00237-x



UNESCO. (2023). Global education monitoring report 2023: Technology in education — A tool on whose terms? UNESCO Publishing.



World Bank. (2022). Digital transformation of Philippine higher education (Report No. AUS0002964). World Bank Group. https://documents1.worldbank.org/curated/en/099925001062333685/pdf/P17757402843a10c90b3e30308406a38304.pdf













CHAPTER 3

RESEARCH METHODOLOGY

This chapter presents the research methodology and system development procedures for the study entitled “Web-Based Student Information and Services Portal (SISP) with a Hybrid NLP- and Semantic-Based Academic Advisory Chat System for Regis Marie College.” It discusses the requirement analysis, requirement documentation, system design, development and testing procedures, prototype description, and implementation plan that will guide the proponents in developing the proposed system.

The chapter presents the processes the proponents will follow in gathering requirements, designing the system, developing the prototype, and evaluating whether the proposed solution satisfies the identified needs of its intended users. The methods described in this chapter were selected to ensure that the SISP effectively addresses the operational inefficiencies identified at Regis Marie College, including fragmented student records management, manual enrollment and service request processing, and limited access to academic advising.

3.1 Requirement Analysis

Requirement analysis is the process of identifying, examining, and organizing the needs of the intended users and stakeholders of the proposed system. In this study, requirement analysis will serve as the basis for determining the features, workflows, data requirements, security controls, and technical components of the SISP with an Academic Advisory Chat System for Regis Marie College.

The proponents will conduct requirement analysis through a developmental research design, which was selected because the study involves the systematic design and evaluation of an educational technology solution intended to address specific institutional problems. This research design is appropriate because it encompasses the stages of analysis, design, development, testing, and evaluation — all of which are integral to the proposed system. Survey questionnaires will be administered via Google Forms, and structured interviews will be conducted with selected stakeholders to gather both quantifiable and in-depth qualitative requirements. Document review will additionally be employed to align the knowledge base with institutional curriculum guides, academic policies, and service request procedures.

3.1.1 Stakeholder Identification

Stakeholders refer to all individuals, groups, or entities that have a stake in the project — those who will use, manage, maintain, or be directly affected by the proposed system. The following table presents the identified stakeholders for this study, including their roles, responsibilities, and expected system access levels.



Table 3.1 Stakeholder Identification and Access Levels

Stakeholder | Roles and Description | Access Level
Students | Primary users of the student portal and academic advisory chat system. Will submit service requests, view academic records, track curriculum progress, and ask academic questions. | Portal user — read access to own academic records, submit and track service requests, use advisory chat.
Faculty Members | Will monitor student academic progress and provide academic support. View subject-related student information relevant to their instructional responsibilities. | Read access to assigned student academic records and class rosters.
Dean | Will provide academic guidance and curriculum-related advising. Review advisee academic standing and monitor common chatbot inquiry trends. | Read access to advisee academic records, curriculum progress, and chat inquiry summaries.
Registrar and Administrative Staff | Will manage student records, process document requests, and generate institutional reports. | Read/write access to student records and service requests; report generation access.
System Administrator / IT Personnel | Will manage user accounts, roles, permissions, system settings, security configurations, and audit logs. | Full administrative access — user management, roles, settings, audit logs, system maintenance.
Regis Marie College | Primary institutional beneficiary. The institution will benefit from improved digital academic services, reduced manual workload, and better access to administrative information. | Institutional beneficiary — no direct system login role.



3.1.2 Data Gathering Methods

The proponents will use three primary data gathering methods: survey questionnaires, structured interviews, and document review. These methods were selected to obtain both measurable and in-depth information from all relevant stakeholder groups. Survey questionnaires will provide quantifiable feedback from students, while interviews will allow administrative personnel and faculty to describe existing workflows and process constraints in detail. Document review will ensure that the academic advisory knowledge base and system requirements are aligned with the actual academic policies and institutional documents of Regis Marie College.



Table 3.2 Data Gathering Methods

Method | Description | Purpose in the Study
Survey Questionnaire via Google Forms | A structured online questionnaire distributed to selected respondents using a five-point Likert scale. | To gather student and user feedback regarding current problems, needed features, usability expectations, and acceptance of the proposed system.
Structured Interview | A guided discussion with selected school personnel and stakeholders to obtain in-depth process information. | To gather detailed information about existing workflows, records handling, academic advising concerns, and system requirements specific to Regis Marie College. Sample interview questions are provided in Section 3.9.2.
Document Review | Review of available curriculum guides, academic policies, request forms, enrollment records, and school documents where permitted. | To identify the content needed for the academic advisory knowledge base and to align the platform with institutional rules, curriculum structure, and service request procedures of Regis Marie College.



3.1.3 Population and Sampling

The respondents of the study will be selected from Regis Marie College. The study will employ a combination of convenience sampling and purposive sampling. Convenience sampling will be used for student respondents who are available and willing to participate, given that students represent the primary end-users of the SISP and a sufficient number can be reached within the institutional setting. Purposive sampling will be applied to faculty members, dean, registrar personnel, administrative staff, and IT personnel because these respondents possess direct and specific knowledge of the workflows, records management practices, and advisory processes that the platform intends to improve.



Table 3.3 Proposed Respondent Groups

Respondent Group | Sampling Approach | Reason for Inclusion
Students | Convenience sampling | Students are the primary users of the portal and academic advisory chat system. Convenience sampling is appropriate given the accessible student population.
Faculty Members | Purposive sampling | Faculty members will provide information about academic monitoring and student support needs. Purposive selection ensures respondents with relevant instructional responsibilities are included.
Dean | Purposive sampling | The dean will validate advising-related requirements and the knowledge base content. These individuals are few and specifically identified.
Registrar and Administrative Staff | Purposive sampling | Administrative staff will provide information about student records, document requests, and existing service workflows.
IT Personnel / System Administrator | Purposive sampling | IT personnel will provide information about system security, account management, and maintenance requirements.



3.1.4 Research Instruments

The study will use a survey questionnaire and an interview guide as its primary research instruments. The survey questionnaire will collect structured responses using a five-point Likert scale (5 — Strongly Agree, 4 — Agree, 3 — Neutral, 2 — Disagree, 1 — Strongly Disagree). The interview guide will collect qualitative information through open-ended questions directed at selected stakeholders. Both instruments will focus on identifying current problems, user needs, expected features, usability considerations, data security concerns, and acceptance of the proposed system.

A usability evaluation form will also be prepared for use during prototype testing to measure learnability, efficiency, navigation clarity, and interface design. A chatbot evaluation checklist will be prepared to assess intent classification accuracy, response relevance, institutional accuracy, clarity, completeness, and appropriate escalation behavior. All instruments will undergo validation through review by the project adviser before being administered.



Table 3.4 Research Instruments

Instrument | Target Respondents / Purpose
Survey Questionnaire | Distributed to selected students and users to measure experience with current processes, needed system features, and acceptance of the proposed SISP.
Interview Guide | Administered to faculty, academic dean, registrar and administrative staff, and IT personnel to collect detailed explanations of existing workflows, requirements, constraints, and security concerns.
Usability Evaluation Form | Administered to selected users who will test the prototype to evaluate learnability, efficiency, ease of navigation, interface design, and overall user satisfaction.
Chatbot Evaluation Checklist | Administered to selected students, advisers, and proponents to evaluate intent classification accuracy, response relevance, institutional accuracy, clarity, completeness, privacy handling, and appropriate escalation.



3.1.5 Data Analysis Procedure

Survey responses will be analyzed using descriptive statistics, specifically frequency count, percentage distribution, and weighted mean. The weighted mean formula to be used is: WM = Σ(f × v) / n, where f is the frequency of each response, v is the scale value assigned to each response, and n is the total number of respondents. This formula produces a single numerical value representing the average strength of agreement across all respondents for each survey item. The weighted mean for each item will be interpreted using the following scale: 4.50–5.00 as Strongly Agree, 3.50–4.49 as Agree, 2.50–3.49 as Neutral, 1.50–2.49 as Disagree, and 1.00–1.49 as Strongly Disagree.

Interview responses will be analyzed through thematic analysis. The proponents will review interview answers, identify recurring concerns, group similar responses into thematic categories, and derive system requirements from patterns observed across stakeholder responses. Thematic categories will include records access and accuracy, enrollment processing, service request delays, academic advising limitations, data privacy, and usability expectations.

Chatbot performance will be analyzed using intent classification accuracy and semantic retrieval relevance. Intent classification accuracy will be computed by dividing the number of correctly classified intents by the total number of evaluated test queries, then multiplying by one hundred to express the result as a percentage. Semantic retrieval relevance will be assessed by evaluating whether the knowledge base content retrieved by the advisory chat subsystem matches the intent of the submitted query. These metrics will provide objective measurements of the advisory chat system’s performance beyond general user satisfaction ratings.



Table 3.5 Data Analysis Procedure

Data Source | Analysis Method | Expected Output
Survey questionnaire | Frequency, percentage, and weighted mean | Summary of user needs, system acceptance, and usability expectations.
Interview responses | Thematic analysis | List of recurring problems, stakeholder requirements, and process constraints.
Testing feedback | Weighted mean and issue categorization | Evaluation of functionality, usability, reliability, and user acceptance.
Chatbot test cases | Intent accuracy rate and retrieval relevance assessment | Measurement of intent classification accuracy (correctly classified queries ÷ total test queries × 100) and advisory response relevance using prepared test queries.



3.1.6 Ethical Considerations

The proponents will observe ethical considerations throughout the conduct of surveys, interviews, and system testing. All respondents will be informed of the purpose of the study prior to participation. Participation will be voluntary, and respondents will be free to decline to answer any question they are not comfortable with.

Since the proposed system will involve academic records, enrollment information, service request details, and chat logs, the study will observe privacy and data security principles aligned with the Data Privacy Act of 2012, or Republic Act No. 10173. Personal and academic data collected during the study will be handled exclusively for academic and system development purposes.

Within the SISP itself, data security measures will include password hashing using bcrypt for all stored user credentials, JWT-based authentication with token expiration to limit session exposure, role-based access control to restrict data access to authorized user roles only, input validation and sanitization on all API endpoints to prevent injection attacks, and audit logging of selected user actions including logins, record modifications, and service request updates. Sensitive data transmitted between the client and server will be protected through secure communication protocols. These security controls will be implemented in compliance with the access control mechanisms defined in the functional and non-functional requirements.

3.2 Requirement Documentation

Requirement documentation organizes the needs of users and stakeholders into clear and structured system requirements. This section presents the functional requirements organized by module, non-functional requirements, user requirements, system requirements, and a user permissions table.

3.2.1 Functional Requirements

Functional requirements describe the specific operations and services that the proposed system must perform. The SISP will include modules for authentication and access control, student portal, service request management, registrar and administrative management, faculty module, dean module, academic advisory chat system, knowledge base management, reporting and dashboard, and audit logging.



Table 3.6 Functional Requirements by Module

Module | Functional Requirement
Authentication and Access Control | The system shall allow users to log in securely using valid credentials and shall provide access to features based on assigned roles through JSON Web Token (JWT)-based authentication with configurable token expiration.
Student Portal | The system shall allow students to view academic records including grades, enrollment history, and curriculum progress, and to monitor the status of submitted service requests in real time.
Service Request Management | The system shall allow students to submit online document or service requests (e.g., transcripts, certifications) and to track their processing status in real time. Administrative staff shall be able to update and process submitted requests.
Registrar / Admin Management | The system shall allow authorized administrative personnel to manage student records, update service request statuses, and generate enrollment and performance reports through the administrative dashboard.
Faculty Module | The system shall allow faculty members to view relevant student academic information and subject or class records assigned to them.
Dean Module | The system shall allow Dean to review advisee progress, academic standing, and advising-related concerns, and to view advisory chat inquiry trends for use in academic support activities.
Academic Advisory Chat System | The system shall allow students to submit academic questions and receive responses through a hybrid approach using NLP-based intent classification via scikit-learn and semantic vector retrieval via pgvector, with complex queries routed to the Groq API for large language model inference.
Knowledge Base Management | The system shall allow authorized users to manage academic policies, curriculum guides, school procedures, and other advising references stored in the knowledge base used by the advisory chat subsystem.
Reporting and Dashboard | The system shall generate real-time summaries of enrollment data, service request statuses, student academic performance, and system usage metrics accessible through the administrative dashboard.
Audit and Logging | The system shall record selected user actions including logins, record modifications, and service request updates for monitoring, accountability, and security review purposes.



3.2.2 Non-Functional Requirements

Non-functional requirements describe the quality attributes that the system must meet to ensure it is secure, usable, maintainable, and reliable for all user types.



Table 3.7 Non-Functional Requirements

Category | Requirement
Performance | The system shall respond within an acceptable time under normal institutional usage conditions and shall avoid unnecessary delays when loading enrollment records, academic dashboards, and generating advisory chat responses.
Security | The system shall use JWT authentication with token expiration, role-based access control, bcrypt password hashing, protected API routes, input validation and sanitization, secure communication protocols, and audit logging in compliance with Republic Act No. 10173.
Usability | The user interface shall be simple, consistent, responsive across desktop and mobile devices, and understandable for students, faculty, dean, and administrative users with varying levels of technical experience. Navigation shall minimize the number of steps required for common tasks such as submitting service requests and accessing academic records. The interface shall also accommodate accessibility considerations relevant to users with varying technical familiarity.
Reliability | The system shall remain available during normal school operations and shall handle common errors without data loss or corruption.
Maintainability | The codebase shall be modular and sufficiently documented to support future updates, debugging, and enhancement by the institution’s IT personnel.
Compliance | The system shall observe privacy and data security principles under Republic Act No. 10173, the Data Privacy Act of 2012, including secure storage, access restrictions, and data handling controls.
Portability | The system shall be accessible through modern web browsers on desktop and mobile devices and shall be deployable using cloud platforms without requiring physical server hardware at the institution.
Scalability | The system shall allow future expansion of user accounts, academic records, system modules, and knowledge base content without requiring significant architectural changes.



3.2.3 User Requirements



Table 3.8 User Requirements

User Type | Requirements
Student | Students will need to access academic records including grades, enrollment history, and curriculum progress; submit service requests; track request statuses in real time; and use the academic advisory chat system for timely academic guidance — directly reducing the need for multiple physical office visits identified in Chapter 1.
Faculty | Faculty members will need to view assigned student academic information and subject or class records relevant to their instructional responsibilities.
Dean | The Dean will need to review advisee academic progress, validate advising-related concerns, and monitor common advisory chat inquiry trends to support informed advising decisions.
Registrar / Admin Staff | Administrative users will need to manage student records, process and update service request statuses, and produce enrollment and performance reports through the administrative dashboard.
System Administrator | System administrators will need to manage user accounts, assign and modify roles and permissions, view audit logs, configure system settings, and monitor security controls.



3.2.4 System Requirements



Table 3.9 System Requirements

Layer | Technology / Requirement
Frontend | Next.js, React, TypeScript, Tailwind CSS, and Zustand for responsive, mobile-compatible, and state-managed user interface development.
Backend | Node.js, NestJS, JWT, Zod, and Prisma ORM for server-side processing, input validation, authentication, and database access.
ML / NLP Service | Python, FastAPI, scikit-learn, pgvector, and Groq API for intent classification, semantic search, and complex academic query handling.
Database | Supabase PostgreSQL with the PGVector extension for relational student records and vector-based semantic retrieval used by the advisory chat subsystem.
Deployment | Vercel for frontend hosting, Render for backend and ML/NLP service deployment, and Supabase for database hosting.
Version Control | Git and GitHub for source code tracking, collaboration, and version history management.
User Device | A modern desktop or mobile device equipped with a web browser and internet connection.



3.2.5 User Permissions Table

The following table summarizes the access rights assigned to each user role within the proposed system, ensuring that sensitive data and administrative functions are accessible only to authorized personnel.



Table 3.10 User Permissions by Role

Feature / Module | Student | Faculty | Acad. Adviser | Registrar / Admin | Sys. Admin
Login and Session Management | Yes | Yes | Yes | Yes | Yes
View Own Grades and Records | Yes | No | No | No | No
View Assigned Student Records | No | Read | Read | Read/Write | Read
Submit Service Requests | Yes | No | No | No | No
Process Service Requests | No | No | No | Yes | No
Use Academic Advisory Chat | Yes | No | No | No | No
View Advisory Chat Inquiry Trends | No | No | Yes | No | No
Manage Knowledge Base | No | No | No | Yes | Yes
Generate Reports / Dashboard | No | No | No | Yes | Yes
Manage User Accounts / Roles | No | No | No | No | Yes
View Audit Logs | No | No | No | No | Yes



3.3 Design of Software, System, Product, and/or Process

This section presents the software development methodology and system design artifacts that will guide the development of the proposed SISP. The design artifacts include use case diagrams for each user role, data flow diagrams at context and process levels, an entity relationship diagram, a chatbot workflow diagram, and the academic advisory chat process flow.

3.3.1 Software Development Methodology

The proponents will use the Agile Software Development Methodology for the development of the proposed system. Agile was selected because the SISP comprises several distinct but interrelated modules — including the student portal, service request system, administrative dashboard, and academic advisory chat system — which can be planned, developed, tested, and refined through short and iterative development cycles. Agile will also allow the proponents to incorporate feedback from the project adviser, stakeholders, and potential users while the prototype is still under development, ensuring that requirements changes can be accommodated before final deployment.

The iterative sprint structure of Agile is particularly relevant to the advisory chat subsystem of the platform, where intent classification accuracy and semantic retrieval relevance must be evaluated and refined through repeated testing cycles. Each sprint will conclude with a review phase that may trigger revisions to the NLP model, knowledge base content, or retrieval configuration before proceeding to the next development iteration.



Figure 3.1 – Agile Software Development Methodology

Table 3.11 Agile Development Phases for the Proposed System

Agile Phase | Activities in the Study
Planning | Define project scope, objectives, stakeholders, system modules, development timeline, and expected outputs based on the identified problems of Regis Marie College.
Requirement Analysis | Gather requirements through Google Forms survey questionnaires and stakeholder interviews to identify user needs, existing workflow problems, and system specifications.
Design | Prepare use case diagrams, DFD Level 0 and Level 1, entity relationship diagram, system architecture diagram, advisory chat workflow diagram, interface wireframes, and module specifications.
Development | Develop the frontend interface, backend services, database schema, and ML/NLP service layer based on prioritized system modules and functional requirements through sprint iterations.
Testing | Conduct functional, integration, usability, security, user acceptance, chatbot intent accuracy, and semantic retrieval relevance testing.
Deployment | Deploy the frontend application to Vercel, the backend and ML/NLP service layer to Render, and the database to Supabase.
Review and Revision | Analyze testing feedback, correct identified errors, improve interface usability, refine the NLP model and knowledge base, and revise system documentation accordingly.



3.3.2 Use Case Diagram

The Use Case Diagram illustrates the interactions between the actors of the proposed system and the functions available within the Student Information and Services Portal. The actors include Students, Faculty Members, Dean, Registrar/Admin Staff, and System Administrators. The diagram presents a unified view of the system and shows how each actor interacts with shared and role-specific functionalities.





Figure 3.2 – Use Case Diagram

3.3.3 Data Flow Diagram Level 0

The Data Flow Diagram (DFD) Level 0, also referred to as the context diagram, will represent the proposed SISP as a single process and identifies the external entities that exchange data with the system. The external entities are: Student, Faculty, Dean, Registrar/Admin Staff, and System Administrator. Data flows will indicate what each external entity sends to the system and what the system returns in response. This diagram establishes the system boundary and provides an overview of all data inputs and outputs at the highest level of abstraction. All external entities, processes, data stores, and arrows in the diagram will follow standard DFD notation.



Figure 3.3 – Data Flow Diagram Level 0 of the Proposed System

3.3.4 Data Flow Diagram Level 1

The DFD Level 1 expands the context diagram into the main internal processes of the proposed system. It shows how authentication and access control, student records management, enrollment and curriculum tracking, service request processing, academic advisory chat processing, report generation, and user and system administration interact with each other and with the system’s data stores.

The data stores identified are: D1 Users and Roles, D2 Student Records, D3 Enrollment/Curriculum, D4 Service Requests, D5 Knowledge Base, D6 Chat Logs, and D7 Reports/Logs. Each process in the Level 1 diagram will be labeled with a unique process number, and all data stores will be clearly identified. Arrows will indicate the direction of data flow between processes, data stores, and external entities. The Level 1 diagram explicitly includes the advisory chat processing flow — from intent classification through semantic retrieval to response generation — and the administrative dashboard reporting mechanism.

 

Figure 3.4 – Data Flow Diagram Level 1 of the Proposed System

3.3.5 Entity Relationship Diagram (ERD)

The Entity Relationship Diagram (ERD) presents the proposed database structure of the system. It identifies the primary entities, their attributes, primary keys (PK), foreign keys (FK), and the cardinalities of their relationships. The principal entities are: Role, User, Student, Faculty, Subject, Curriculum, Grade, Enrollment, ServiceRequest, KnowledgeBase, ChatLog, and AuditLog.

Key relationships and cardinalities include: User to Role (many-to-one, FK: roleId), User to Student (one-to-zero-or-one, FK: userId), User to Faculty (one-to-zero-or-one, FK: userId), Student to Enrollment (one-to-many, FK: studentId), Student to Grade (one-to-many through Subject, FK: studentId, subjectId), Subject to Curriculum (one-to-many, FK: subjectId), Student to ServiceRequest (one-to-many, FK: studentId), Student to ChatLog (one-to-many, FK: studentId), KnowledgeBase to ChatLog (retrieved context association), and User to AuditLog (one-to-many, FK: userId). The database schema has been designed in third normal form (3NF) to minimize data redundancy and maintain referential integrity across all student and institutional records.



Figure 3.5 – Entity Relationship Diagram of the Proposed System



3.3.6 Academic Advisory Chat Process Flow and Workflow Diagram

The academic advisory chat system will use a hybrid approach that combines NLP-based intent classification and semantic vector search. The workflow will follow the procedural steps described below.

Session Validation. When a student submits a query, the system first validates the user session and role to ensure only authenticated students may access the advisory chat subsystem.

Input Preprocessing. The submitted text will undergo preprocessing, including tokenization, lowercasing, and stop word removal, to prepare it for intent classification.

Intent Classification. The preprocessed input will be classified by the scikit-learn intent classification model, which identifies the purpose and category of the query. Intent classification accuracy will be measured as the ratio of correctly classified queries to the total number of evaluated test queries.

Direct Response Generation. If the classified intent corresponds to a routine academic inquiry, a direct response will be generated from the predefined response logic associated with that intent.

Semantic Vector Retrieval. For queries requiring context-sensitive institutional knowledge, the platform will perform semantic vector search using pgvector. Semantic retrieval will compare the embedding of the student’s query against stored knowledge base embeddings to identify contextually similar content.

RAG Escalation via Groq API. For complex queries that exceed the resolution capability of the intent classifier and knowledge base retrieval — such as multi-part academic questions or policy interpretations — the query, along with the retrieved context, will be routed to the Groq API for large language model inference using Retrieval-Augmented Generation (RAG).

Response Delivery and Logging. The final advisory response will be returned to the student through the chat interface. The interaction, including the query, classified intent, retrieved context, and generated response, will be stored in the ChatLog for review and future model improvement.



Figure 3.6 – Academic Advisory Chat Workflow Diagram



3.3.7 Sequence Diagram: Advisory Chat Interaction

The sequence diagram below illustrates the end-to-end interaction flow of the academic advisory chat subsystem across all system layers. It shows the temporal sequence of messages exchanged between the student, the frontend interface, the backend API layer, the ML/NLP service layer, the pgvector semantic search component, and the Groq API for complex inference.

The interaction flow proceeds as follows: the student submits a query through the frontend interface, which forwards the authenticated request to the backend API layer. The backend API layer routes the chat request to the ML/NLP service layer, which performs intent classification and, if required, semantic vector retrieval via pgvector. If the query requires advanced inference, the ML/NLP service layer passes the query and retrieved context to the Groq API. The generated response is then returned through the service layers to the frontend interface, where it is displayed to the student. The full interaction is logged in the ChatLog for monitoring and model improvement purposes.



Figure 3.7 – Sequence Diagram: Academic Advisory Chat Interaction

3.4 System Architecture and Deployment

The proposed SISP is built on a multi-layer web-based architecture that separates system concerns into distinct but integrated layers: the frontend presentation layer, the backend API layer, the machine learning and NLP service layer, and the database layer. This separation supports maintainability, independent deployment of components, and modular development aligned with the Agile methodology described in Section 3.3.1.

3.4.1 Architecture Layer Description

The frontend layer will be developed using Next.js with React and TypeScript, providing a responsive web interface accessible through standard browsers on both desktop and mobile devices. The backend layer will be developed using NestJS and will expose RESTful API endpoints for authentication, student records, service request processing, reporting, and system administration. The ML/NLP service layer will be developed using Python and FastAPI and will handle academic advisory chat processing, including intent classification, semantic retrieval, and Groq API integration. The database layer will use Supabase PostgreSQL with the PGVector extension for both relational student data storage and vector-based semantic retrieval.

Communication between the frontend and the backend API layer will be secured through JWT-based authentication. The backend API layer will communicate with the ML/NLP service layer via internal API calls. The ML/NLP service layer will access the vector-enabled database for semantic retrieval and will call the Groq API for complex inference. All data exchanges will comply with the access control and security requirements defined in Section 3.2.

3.4.2 Architecture Interaction Narrative

The following describes how all architecture layers will communicate in a complete end-to-end request:

The student or authorized user accesses the platform through a standard web browser on a desktop or mobile device.

The frontend layer, served via Vercel, renders the appropriate role-based dashboard and sends HTTP requests to the backend API layer hosted on Render.

The backend API layer, built with NestJS, validates the JWT session token, applies role-based access control, and processes the request by querying the Supabase PostgreSQL database through Prisma ORM for records-related operations.

For academic advisory chat requests, the backend API layer routes the query to the ML/NLP service layer, also hosted on Render, which runs as a separate FastAPI service.

The ML/NLP service layer performs intent classification using the scikit-learn model and conducts semantic vector search via pgvector against the knowledge base stored in Supabase PostgreSQL.

If the query requires advanced inference, the ML/NLP service layer calls the Groq API with the query and retrieved context to generate a response through Retrieval-Augmented Generation.

The generated response is returned from the ML/NLP service layer through the backend API layer to the frontend, where it is displayed to the student. The interaction is stored in the ChatLog for audit and improvement purposes.





Figure 3.8 – System Architecture Diagram

3.4.3 Deployment Architecture

The proposed deployment architecture distributes the SISP across cloud-based platforms to eliminate the need for physical server hardware at Regis Marie College. The frontend application will be hosted on Vercel, which provides continuous deployment from the GitHub repository and serves the user interface to all user roles. The backend API service and the ML/NLP service layer will each be deployed as separate hosted services on Render. The Supabase PostgreSQL database, including the PGVector extension required for semantic retrieval, will be hosted on Supabase. All source code, development history, and version branches will be maintained on GitHub.





Figure 3.9 – Deployment Architecture Diagram

Table 3.12 Deployment Plan

Component | Platform | Purpose
Frontend Application | Vercel | Hosts the Next.js web application and serves the user interface to all user roles.
Backend API Service | Render | Hosts the NestJS backend service that manages authentication, records, and business logic.
ML/NLP Service Layer | Render | Hosts the FastAPI service responsible for intent classification and semantic retrieval.
Database | Supabase | Hosts the PostgreSQL relational database and PGVector extension for semantic search data.
Source Code Repository | GitHub | Stores and tracks the source code, development history, and version branches of the project.



3.5 Development and Testing

This section describes how the proposed system will be built and how it will be verified for correctness, functionality, and performance. It includes the development environment, tools and technologies, version control strategy, testing methods, and evaluation criteria.

3.5.1 Development Environment



Table 3.13 Development Environment and Tools

Component | Tools / Technologies
Code Editor | Visual Studio Code
Frontend Development | Next.js, React, TypeScript, Tailwind CSS, Zustand
Backend Development | Node.js, NestJS, JWT, Zod, Prisma ORM
ML / NLP Development | Python, FastAPI, scikit-learn, pgvector, Groq API
Database Management | Supabase PostgreSQL with PGVector extension
Version Control | Git and GitHub
Deployment Platforms | Vercel (frontend), Render (backend and ML/NLP service layer), Supabase (database)
Testing Tools | Browser-based testing tools, API testing tools, prepared test cases, usability evaluation forms, and chatbot evaluation checklists



3.5.2 Version Control

The proponents will use Git and GitHub to manage the source code of the proposed system. Version control will allow the proponents to track development changes, maintain previous code versions, collaborate on system modules, and recover files when necessary. Commit messages will be used to document development progress, while separate branches will be used to manage frontend, backend, database schema, and ML/NLP service layer development tasks independently before merging into the main development branch.

3.5.3 Testing Methods

The following testing methods were identified as appropriate for the proposed system. These methods address the multiple components of the SISP, including web application modules, database operations, role-based access control, and the academic advisory chat subsystem.

Table 3.14 Testing Methods

Testing Method | Purpose | Target Component
Functional Testing | To verify that each feature performs according to the defined functional requirements. | Login, student records, service requests, dashboards, reports, and the academic advisory chat module.
Integration Testing | To verify that the frontend, backend, database, and ML/NLP service layer communicate correctly through all defined API endpoints and data flows. | API routes, Prisma/database queries, FastAPI service, and the complete advisory chat workflow from intent classification through response delivery.
Usability Testing | To evaluate whether users can understand, navigate, and effectively use the platform, including learnability, efficiency, and mobile responsiveness. | User interface, navigation menus, forms, dashboards, and the advisory chat interface across both desktop and mobile device configurations.
Security Testing | To verify that authentication, authorization, input validation, password hashing, JWT expiration, and protected routes function correctly. | Login, JWT authentication, role-based access control, input validation, sensitive data routes, and audit logging.
User Acceptance Testing (UAT) | To determine whether selected users find the platform acceptable for its intended purpose and workflows. | Overall prototype and major user workflows for each user role.
Chatbot Intent Accuracy Testing | To measure the percentage of test queries correctly classified by the scikit-learn intent classification model. | scikit-learn intent classification model using a prepared set of test queries with known expected intents. Accuracy = (correctly classified queries / total test queries) × 100.
Semantic Retrieval Relevance Testing | To verify whether pgvector semantic search retrieves knowledge base content that is contextually relevant to the student query. | pgvector semantic search and knowledge base content retrieval.
Performance Testing | To measure response time and loading behavior of the system under normal prototype testing conditions. | Enrollment records, academic dashboards, API responses, and advisory chat replies during institutional use simulation.



3.5.4 Evaluation Criteria

The evaluation criteria define the specific attributes that will be measured during system testing and user acceptance activities.



Table 3.15 Evaluation Criteria

Criteria | Description | Measurement Standard
Functionality | Measures whether the system features perform the intended tasks as defined in the functional requirements. | All defined functional requirements will be verified through prepared test cases; failures will be documented and resolved before finalization.
Usability | Measures whether users of all roles can easily understand, navigate, and use the platform, including learnability, task efficiency, and mobile accessibility. | Weighted mean ratings from usability evaluation forms administered after prototype testing; includes evaluation of mobile responsiveness and reduced workflow steps compared to current manual processes.
Reliability | Measures whether the system performs consistently without failure or data loss during testing and normal operation. | Absence of data loss, system crashes, or unhandled errors during testing sessions.
Security | Measures whether the system correctly protects academic records, restricts access based on user roles, and handles input safely. | Verified through security testing of authentication, authorization, input validation, and audit logging.
Performance | Measures whether enrollment records, academic dashboards, and advisory chat responses load without significant delay during institutional use. | Observation of response time during testing; no significant delays expected under normal institutional usage conditions.
Chatbot Accuracy | Measures whether the intent classification model correctly identifies the purpose of student queries submitted to the advisory chat subsystem. Accuracy is computed as: (correctly classified intents / total test queries) × 100. | Intent classification accuracy percentage derived from a prepared set of test queries with known expected intents.
Response Relevance | Measures whether advisory chat responses are based on accurate and contextually relevant academic content from the institutional knowledge base. | Assessed through the chatbot evaluation checklist administered to selected evaluators.
User Satisfaction | Measures overall user acceptance of the prototype through feedback collected during usability and UAT activities. | Weighted mean ratings from the usability evaluation form and UAT feedback using a five-point Likert scale.

3.6 Description of the Prototype

The prototype of the proposed system will be designed as a web-based platform that integrates student information management, academic services, administrative workflows, and an AI-powered academic advisory chat system. The prototype will demonstrate the major workflows required by students, faculty, Dean, administrative staff, and system administrators of Regis Marie College.

3.6.1 Prototype Overview

The prototype will provide a centralized platform for accessing student academic information, managing service requests, monitoring academic progress, and answering academic inquiries through the advisory chat subsystem. The platform will be accessible through a standard web browser and will use role-based access control to determine the features and data available to each user type.

The prototype directly addresses the institutional problems identified in Chapter 1: the fragmented management of student records across departmental files will be replaced by a centralized database with controlled access; the requirement for multiple physical office visits during enrollment will be reduced by online service request submission and real-time status tracking; and the limited availability of academic advising outside scheduled hours will be extended by the AI-powered advisory chat system. The prototype demonstrates that these improvements can be delivered through an integrated and accessible digital platform.

3.6.2 Functional Features of the Prototype

Table 3.16 Prototype Features

Feature | Description
Login and Role-Based Access | Allows users to authenticate securely and access features according to their assigned role using JWT-based authentication with configurable token expiration.
Student Dashboard | Displays a summary of academic information including service request status, curriculum progress, and available student services.
Grades and Enrollment History | Allows students and authorized users to view grade records and enrollment history per semester.
Curriculum Tracking | Shows the student’s academic progress based on curriculum requirements, including completed, ongoing, and remaining subjects with overall completion status.
Service Request Module | Allows students to submit online requests for academic documents such as transcripts and enrollment certificates, and to track processing status in real time — reducing the need for repeated office visits identified in Chapter 1.
Faculty Dashboard | Allows faculty members to monitor relevant student academic information and assigned subject or class records.
Dean Dashboard | Allows Dean to review advisee academic progress, standing, and advising-related concerns, and to view advisory chat inquiry trends.
Admin Dashboard | Allows administrative staff and registrar personnel to manage student records, process service requests, update statuses, and view enrollment and performance reports.
Academic Advisory Chat System | Allows students to ask academic questions and receive responses generated through the hybrid NLP and semantic retrieval workflow described in Section 3.3.6.
Knowledge Base Management | Allows authorized users to manage curriculum guides, academic policies, and school procedures referenced by the advisory chat subsystem.
Reports and Logs | Allows authorized personnel to view real-time enrollment summaries, service request statuses, student academic performance, and system activity logs.



3.6.3 User Interface and User Experience Design

The user interface of the proposed SISP will be designed with simplicity, consistency, responsiveness, and accessibility as primary considerations. The interface will use clear navigation menus, readable labels, organized data tables, and status indicators to guide users through system workflows. Input forms will include appropriate labels and validation messages to minimize user errors. The advisory chat interface will be designed to resemble a conversational message-based interaction where students can type academic questions and receive contextually relevant responses.

The user experience will prioritize accessibility, ease of navigation across both desktop and mobile devices, and efficient task completion. Students will be able to check academic records, submit service requests, and consult the advisory chat without unnecessary steps — directly addressing the current problem of requiring multiple physical office visits per enrollment period as identified in Chapter 1. Administrative users will be able to update records and process requests efficiently through the administrative dashboard, reducing manual workload and reliance on paper-based processes. The interface will also be designed to accommodate users with varying levels of technical familiarity, further supporting the accessibility goals of the platform.

3.6.4 User Interaction Workflow

Table 3.17 Sample User Interaction Workflow

Workflow | User Action | System Response
Login | The user enters valid credentials and submits the login form. | The system validates the credentials, generates a JWT session, and redirects the user to the appropriate role-based dashboard.
View Academic Records | The student navigates to the grades or enrollment history page. | The system retrieves and displays the authorized academic records associated with the authenticated student account.
Submit Service Request | The student fills out an online service request form and submits it. | The system records the request, assigns a tracking status, and displays the current request status to the student.
Process Service Request | The registrar or administrative staff reviews and processes a submitted request. | The system updates the request status and makes the updated status visible to the student in real time.
Ask Academic Question | The student enters an academic question in the advisory chat interface. | The system classifies the query intent, retrieves relevant content from the knowledge base, generates an advisory response, and stores the interaction in the chat log.
Generate Report | The administrative staff selects a report type from the administrative dashboard. | The system generates and displays a summary based on available enrollment, service request, or academic performance data.



3.6.5 Wireframes and Interface Screens

The following figures present the wireframes and interface layouts for the major screens of the proposed SISP. These designs illustrate the application of the UI and UX principles described above and show how each user role interacts with the platform’s features.



Figure 3.10 – Login Page Layout



Figure 3.11 – Student Dashboard Layout



Figure 3.12 – Curriculum Tracking Screen



Figure 3.13 – Service Request Submission and Tracking Screen



Figure 3.13 – Academic Advisory Chat Interface



Figure 3.14 – Admin Dashboard and Reports Screen

3.7 Implementation Plan

The implementation plan presents the steps that will guide the proponents in completing, testing, deploying, and documenting the proposed SISP. The implementation period is planned for eleven (11) weeks.

3.7.1 Project Timeline

Table 3.18 Eleven-Week Implementation Timeline

Week | Activities | Expected Output
Week 1 | Finalize requirements, identify respondents, and prepare research instruments. | Approved data gathering plan, draft survey questionnaire, and interview guide.
Week 2 | Conduct survey through Google Forms and conduct stakeholder interviews. | Collected survey and interview responses from selected respondents.
Week 3 | Analyze gathered data and finalize requirement documentation. | Documented functional and non-functional requirements.
Week 4 | Prepare system design diagrams and finalize database structure. | Completed use case diagrams, DFD Level 0 and Level 1, ERD, system architecture diagram, deployment architecture diagram, sequence diagram, and advisory chat workflow diagram.
Week 5 | Continue frontend development and refine interface designs. | Updated student, faculty, adviser, and admin user interface pages with mobile-responsive layouts.
Week 6 | Develop backend modules and database operations. | Implemented authentication, student records, service requests, and role-based access.
Week 7 | Develop ML/NLP service layer, prepare NLP training dataset, train intent classifier, configure pgvector embeddings, and build knowledge base retrieval. | Functional intent classification model, semantic search configuration, and advisory chat workflow.
Week 8 | Integrate frontend, backend, database, and ML/NLP service layer components. | Integrated prototype with complete data flow across all system layers.
Week 9 | Conduct functional, integration, security, and chatbot testing. | Testing records, bug list, intent accuracy results, and preliminary evaluation summary.
Week 10 | Conduct usability testing and user acceptance testing. | User feedback, usability evaluation results, and user acceptance summary.
Week 11 | Revise system based on feedback and finalize all documentation. | Final prototype, revised chapter documentation, chatbot evaluation results, and supporting documentation.



3.7.2 Team Roles and Responsibilities

Table 3.19 Proposed Team Responsibilities

Responsibility Area | Description
Project Coordination | Monitors the development timeline, tracks task distribution, incorporates adviser feedback, and manages document submission schedules.
Requirement Gathering and Documentation | Prepares the survey questionnaire, interview guide, requirement analysis tables, and thesis chapter documentation.
Frontend Development | Develops the user interface, role-based dashboards, pages, forms, and responsive design using Next.js, React, TypeScript, and Tailwind CSS.
Backend Development | Develops API endpoints, authentication logic, input validation, role-based access control, and business logic using NestJS and Prisma ORM.
Database Design and Management | Designs the database schema, entity relationships, migration scripts, and data access operations using Prisma ORM and Supabase PostgreSQL.
ML/NLP and Chatbot Development | Prepares the NLP training dataset, develops the intent classification model using scikit-learn, configures semantic retrieval using pgvector, manages knowledge base content, and integrates the advisory chat workflow with the Groq API via FastAPI.
Testing and Quality Assurance | Prepares test cases, records testing results, identifies and reports errors, and validates corrections across all testing phases including chatbot accuracy testing.
Deployment and Maintenance | Handles deployment of the frontend to Vercel, backend and ML/NLP service layer to Render, and database to Supabase, and monitors prototype operation during evaluation.

3.7.3 Maintenance Plan

During the capstone evaluation period, the proponents will maintain the prototype by correcting identified bugs, updating system documentation, refining the knowledge base content, and improving platform usability based on feedback gathered from testing activities. If the proposed system is adopted for full institutional deployment beyond the capstone period, future maintainers may update database records, academic policies, curriculum content, user accounts, and system security controls as needed to reflect changes in institutional requirements.

3.8 Implementation Results

Since the prototype is currently under active development, the final implementation results will be documented after the remaining system modules have been developed, integrated, and subjected to all planned testing activities. The expected implementation result outputs are summarized in the following table.

Table 3.20 Planned Implementation Result Outputs

Output | Description
Completed Prototype Screenshots | Screenshots of the major system pages including the login screen, role-based dashboards, service request module, administrative reports, and advisory chat interface.
Feature Completion Checklist | A list of all system features categorized as completed, partially completed, or pending, based on the functional requirements.
Testing Summary | A summary of results from functional, integration, usability, security, and user acceptance testing activities.
Chatbot Evaluation Results | Measurement of intent classification accuracy rate (correctly classified queries / total test queries × 100), semantic retrieval relevance assessment, advisory response usefulness ratings, and collected user feedback on the academic advisory chat subsystem.
User Feedback Summary | A summary of weighted mean ratings and comments gathered from selected testers during usability and user acceptance testing.
Known Limitations | Documentation of limitations encountered during prototype development and testing, consistent with the limitations stated in Chapter 1.



3.9 Proposed Data Gathering Instruments

The following instruments were prepared to support the requirement analysis and prototype evaluation activities of the study. These instruments may be revised following review by the project adviser and panel members.

3.9.1 Survey Questionnaire for Students and Users

The survey questionnaire will use a five-point Likert scale: 5 — Strongly Agree, 4 — Agree, 3 — Neutral, 2 — Disagree, and 1 — Strongly Disagree.

Table 3.21 Proposed Survey Questionnaire Items

No. | Survey Statement
1 | The current process of accessing academic records is convenient.
2 | The current process of requesting school documents is fast and easy to track.
3 | Students can easily get academic advising when needed.
4 | A web-based student portal would improve access to academic information.
5 | Online service request submission would reduce the need for repeated office visits.
6 | A request tracking feature would help students monitor document processing status.
7 | A curriculum tracking feature would help students understand their academic progress.
8 | An academic advisory chat system would help answer common academic questions.
9 | The proposed system should protect student records and personal information.
10 | I am willing to use the proposed Student Information and Services Portal if implemented at Regis Marie College.



3.9.2 Interview Guide for School Personnel

Table 3.22 Proposed Interview Guide

No. | Interview Question
1 | What are the common problems encountered in handling student records and academic service requests?
2 | What school processes are still handled manually or require repeated face-to-face transactions?
3 | What types of student service requests are most commonly submitted to the registrar or administrative office?
4 | What academic advising questions are most frequently asked by students outside of scheduled consultation hours?
5 | What data and information should be visible to students, faculty, Dean, and administrative staff through the portal?
6 | What security or privacy concerns should be considered when handling student records in a digital system?
7 | What reports or summaries would be most useful for administrative monitoring and institutional decision-making?
8 | What school documents or academic policies may be used as reference content for the academic advisory chat system?
9 | What system features should be prioritized in the first version of the prototype?
10 | What limitations should the proponents consider in implementing the proposed system for Regis Marie College?



3.9.3 Usability Evaluation Form

The usability evaluation form will be answered by selected users after testing the prototype. The form will use a five-point Likert scale consistent with the survey questionnaire. The form will cover learnability, efficiency, memorability, error handling, and overall satisfaction.



Table 3.23 Proposed Usability Evaluation Items

No. | Evaluation Statement
1 | The system interface is easy to understand and navigate.
2 | The navigation menus are clear and logically organized.
3 | Enrollment records, dashboards, and advisory chat responses load without significant delay during testing.
4 | The forms are easy to complete and submit.
5 | The system displays helpful messages when an error occurs.
6 | The dashboard provides useful and relevant information.
7 | The service request process is easy to follow and complete without requiring unnecessary steps or office visits.
8 | The academic advisory chat interface is easy to use.
9 | The system is accessible and usable on both desktop and mobile devices.
10 | Overall, I am satisfied with the prototype of the proposed SISP.



3.9.4 Chatbot Evaluation Checklist

Table 3.24 Proposed Chatbot Evaluation Checklist

Criteria | Evaluation Question
Intent Classification | Did the academic advisory chat system correctly identify the type and purpose of the student query? (Accuracy is measured as: correctly classified queries / total test queries × 100.)
Response Relevance | Was the advisory response directly related to the student’s academic question and based on content from the institutional knowledge base?
Institutional Accuracy | Was the response based on accurate and current school policies, curriculum guides, or academic information of Regis Marie College?
Clarity | Was the advisory response written in a manner that is clear and easy to understand?
Completeness | Did the advisory response provide sufficient information to address the student’s query?
Privacy | Did the chat system avoid exposing restricted academic information to unauthorized users?
Escalation | Did the chat system appropriately recommend contacting the relevant office or adviser when the query required human validation or institutional discretion?

3.10 System Flowcharts

This section illustrates the operational workflows for each actor within the proposed system. Each figure outlines the step-by-step process flow to provide clarity on how users and the system interact.



Figure 3.15 – Student Flowchart





Figure 3.16 – Faculty Flowchart



Figure 3.17 – Dean Flowchart



Figure 3.18 – System Admin Flowchart



Figure 3.19 – Registrar Flowchart

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      



                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             









