// noinspection JSUnusedGlobalSymbols
export default async function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ "_includes/css/output.css": "style.css" });
    eleventyConfig.addPassthroughCopy({ "_includes/fonts": "fonts" });
    eleventyConfig.addWatchTarget("_includes/css/output.css");

    eleventyConfig.setServerOptions({
        watch: ["_site/**/*.css"],
        delay: 1000
    });

    return {
        dir: {
            input: ".",
            output: "_site",
            includes: "_includes"
        }
    };
};