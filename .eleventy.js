import {eleventyImageTransformPlugin} from "@11ty/eleventy-img";
import {execSync} from "child_process";

const contentTags = ["concept", "method", "story", "practice", "project", "playground"];

function getGitLastModified(filePath) {
    try {
        const result = execSync(`git log -1 --format=%ci "${filePath}"`, {encoding: "utf-8"}).trim();
        return result ? new Date(result) : new Date();
    } catch {
        return new Date();
    }
}

function sortByTitle(a, b) {
    const strip = (title) => title.replace(/^[^a-zA-Z]+/, '');
    return strip(a.data.title).localeCompare(strip(b.data.title));
}

// noinspection JSUnusedGlobalSymbols
export default async function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({"_includes/css/output.css": "style.css"});
    eleventyConfig.addPassthroughCopy({"_includes/js/bundle.js": "bundle.js"});
    eleventyConfig.addPassthroughCopy({"_includes/fonts": "fonts"});
    eleventyConfig.addWatchTarget("_includes/css/output.css");
    eleventyConfig.addWatchTarget("_includes/js/bundle.js");
    eleventyConfig.addPlugin(eleventyImageTransformPlugin);

    eleventyConfig.setServerOptions({
        watch: ["_site/**/*.css", "_site/**/*.js"],
        delay: 1000
    });

    // Create sorted collections for each content type
    for (const tag of contentTags) {
        eleventyConfig.addCollection(`${tag}Sorted`, function (collectionApi) {
            return collectionApi.getFilteredByTag(tag).sort(sortByTitle);
        });
    }

    // Combine all content into a single sorted collection
    eleventyConfig.addCollection("allContentSorted", function (collectionApi) {
        return contentTags.flatMap(tag => collectionApi.getFilteredByTag(tag)).sort(sortByTitle);
    });

    // Sitemap collection sorted by last modified (most recent first)
    eleventyConfig.addCollection("sitemapSorted", function (collectionApi) {
        const allPages = collectionApi.getAll();
        const mostRecentByCollection = {};
        let mostRecentOverall = new Date(0);

        // Single pass: calculate git dates and track the most recent per collection
        for (const page of allPages) {
            const gitDate = getGitLastModified(page.inputPath);
            page.data.gitLastModified = gitDate;

            const tags = page.data.tags || [];
            for (const tag of tags) {
                if (!mostRecentByCollection[tag] || gitDate > mostRecentByCollection[tag]) {
                    mostRecentByCollection[tag] = gitDate;
                }
                if (contentTags.includes(tag) && gitDate > mostRecentOverall) {
                    mostRecentOverall = gitDate;
                }
            }
        }

        // Assign final lastModified and sort
        return allPages.map(page => {
            const from = page.data["useMostRecentFrom"];
            if (from === "all") {
                page.data.lastModified = mostRecentOverall;
            } else if (from) {
                page.data.lastModified = mostRecentByCollection[from] || page.data.gitLastModified;
            } else {
                page.data.lastModified = page.data.gitLastModified;
            }
            return page;
        }).sort((a, b) => b.data.lastModified - a.data.lastModified);
    });

    return {
        dir: {
            input: ".",
            output: "_site",
            includes: "_includes"
        }
    };
};