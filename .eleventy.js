import {eleventyImageTransformPlugin} from "@11ty/eleventy-img";

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

    // Helper function to strip leading non-letter characters for sorting
    const getSortableTitle = (title) => {
        return title.replace(/^[^a-zA-Z]+/, '');
    };

    // Create sorted collections
    eleventyConfig.addCollection("conceptSorted", function(collectionApi) {
        return collectionApi.getFilteredByTag("concept").sort((a, b) => {
            return getSortableTitle(a.data.title).localeCompare(getSortableTitle(b.data.title));
        });
    });

    eleventyConfig.addCollection("storySorted", function(collectionApi) {
        return collectionApi.getFilteredByTag("story").sort((a, b) => {
            return getSortableTitle(a.data.title).localeCompare(getSortableTitle(b.data.title));
        });
    });

    eleventyConfig.addCollection("projectSorted", function(collectionApi) {
        return collectionApi.getFilteredByTag("project").sort((a, b) => {
            return getSortableTitle(a.data.title).localeCompare(getSortableTitle(b.data.title));
        });
    });

    eleventyConfig.addCollection("practiceSorted", function(collectionApi) {
        return collectionApi.getFilteredByTag("practice").sort((a, b) => {
            return getSortableTitle(a.data.title).localeCompare(getSortableTitle(b.data.title));
        });
    });

    eleventyConfig.addCollection("methodSorted", function(collectionApi) {
        return collectionApi.getFilteredByTag("method").sort((a, b) => {
            return getSortableTitle(a.data.title).localeCompare(getSortableTitle(b.data.title));
        });
    });

    eleventyConfig.addCollection("playgroundSorted", function(collectionApi) {
        return collectionApi.getFilteredByTag("playground").sort((a, b) => {
            return getSortableTitle(a.data.title).localeCompare(getSortableTitle(b.data.title));
        });
    });

    return {
        dir: {
            input: ".",
            output: "_site",
            includes: "_includes"
        }
    };
};