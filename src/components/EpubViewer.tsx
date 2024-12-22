import './EpubViewer.css';
import {useEffect, useState} from 'react';
import ePub, {Book, Location, Rendition} from "epubjs";
import Section from "epubjs/types/section";
import Navigation from "epubjs/types/navigation";

export const EpubViewer = () => {
    const [book, setBook] = useState<Book | null>(null);
    const [rendition, setRendition] = useState<Rendition | null>(null);
    const [currentChapter, setCurrentChapter] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event?.target?.files ? event.target.files[0] : null;
        if (file) {
            // load book from uploaded file
            const newBook = ePub(await file.arrayBuffer());
            await newBook.ready;
            setBook(newBook);
        }
    };

    const handleButtonClick = async () => {
        if (rendition && currentChapter) {
            const section = book?.spine.get(currentChapter);
            if (section) {
                const contents = await section.render();
                const parser = new DOMParser();
                const doc = parser.parseFromString(contents, "text/html");
                const text = doc.body.textContent || "";
                console.log(text);
            }
        }
    };

    useEffect(() => {
        if (book && !rendition) {

            // show the book in the viewer
            const newRendition = book.renderTo("viewer", {
                width: "100%",
                height: 600,
                spread: "always"
            });
            setRendition(newRendition);

            // display the current section
            const params = URLSearchParams && new URLSearchParams(document.location.search.substring(1));
            const currentSectionIndex = (params && params.get("loc") || undefined);
            newRendition.display(currentSectionIndex);

            book.ready.then(function () {

                // Next button
                const next = document.getElementById("next");
                if (next) {
                    next.addEventListener("click", function (e) {
                        newRendition.next();
                        e.preventDefault();
                    }, false);
                }

                // Prev button
                const prev = document.getElementById("prev");
                if (prev) {
                    prev.addEventListener("click", function (e) {
                        newRendition.prev();
                        e.preventDefault();
                    }, false);
                }
            })

            newRendition.on("rendered", function (section: Section) {
                const current = book.navigation && book.navigation.get(section.href);

                if (current) {
                    setCurrentChapter(current.href);
                    const $select = document.getElementById("toc");
                    if ($select) {
                        const $selected = $select.querySelector("option[selected]");
                        if ($selected) {
                            $selected.removeAttribute("selected");
                        }

                        const $options = $select.querySelectorAll("option");
                        for (let i = 0; i < $options.length; ++i) {
                            const selected = $options[i].getAttribute("ref") === current.href;
                            if (selected) {
                                $options[i].setAttribute("selected", "");
                            }
                        }
                    }
                }

            });

            newRendition.on("relocated", function (location: Location) {

                const next = document.getElementById("next");
                const prev = document.getElementById("prev");

                if (next) {
                    if (location.atEnd) {
                        next.style.visibility = "hidden";
                    } else {
                        next.style.visibility = "visible";
                    }
                }

                if (prev) {
                    if (location.atStart) {
                        prev.style.visibility = "hidden";
                    } else {
                        prev.style.visibility = "visible";
                    }
                }

            });

            // create dropdown for table of contents
            book.loaded.navigation.then((navigation: Navigation) => {
                const $select = document.getElementById("toc") as HTMLSelectElement;
                const documentFragment = document.createDocumentFragment();

                if (!$select) {
                    return;
                }

                // create options in dropdown for each chapter
                navigation.forEach(chapter => {
                    const option = document.createElement("option");
                    option.textContent = chapter.label;
                    option.setAttribute("ref", chapter.href);
                    documentFragment.appendChild(option);

                    // create options in dropdown for each subchapter
                    if (chapter.subitems && chapter.subitems.length > 0) {
                        const subDocumentFragment = document.createDocumentFragment();
                        chapter.subitems.forEach(subitem => {
                            const subOption = document.createElement("option");
                            subOption.textContent = ` - ${subitem.label}`;
                            subOption.setAttribute("ref", subitem.href);
                            subDocumentFragment.appendChild(subOption);
                        });
                        documentFragment.appendChild(subDocumentFragment);
                    }

                    return {};
                });

                $select.appendChild(documentFragment);

                // jump to first chapter in book
                newRendition.display(navigation.toc[0].href);

                $select.onchange = () => {
                    const index = $select.selectedIndex;
                    const url = $select.options[index].getAttribute("ref");

                    if (url) {
                        setCurrentChapter(url);
                        newRendition.display(url);
                    }
                    return false;
                };

            });
        }
    }, [book, rendition]);

    return (
        <div style={{padding: "20px"}}>
            <h2>Datei auswählen</h2>
            <input type="file" accept=".epub" onChange={handleFileChange}/>

            <select id="toc"></select>
            <button onClick={handleButtonClick}>Quizfragen generieren</button>
            <div id="viewer" className="spreads"></div>
            <a id="prev" href="#prev" className="arrow">‹</a>
            <a id="next" href="#next" className="arrow">›</a>

        </div>
    );
};
