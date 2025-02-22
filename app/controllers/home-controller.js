const Post = require('../models/post-model.js')
const { capitalizeEachWord } = require('../utils/helper.js')
const marked = require('marked')

const layout = 'layouts/home'

const homePage = async (req, res) => {
    try {
        const posts =await Post.aggregate([
                {
                    $sort: { createdAt:  -1 }
                },
                {
                    $match: { status: 'published' }
                }
            ])
                .limit(7)
                .exec()

        res.render('index', {
            posts,
            layout,
            locale,
            capitalizeEachWord,
            pageActive: 'home'
        })
    } catch (err) {
        console.error(err)
    }
}


const aboutPage = async (req, res) => {
    try {
        res.render('about', {
            layout,
            locale,
            pageActive: 'about'
        })
    } catch (err) {
        console.error(err)
    }
}


const postsPage = async (req, res) => {
    try {
        let perPage = 10
        let page = req.query.page || 1

        const {
            order = null,
            category = null,
            tag = null,
            search = null
        } = req.query
        const categoryUrl = `${tag ? 'tag=' + tag + '&' : ''}${
            order ? 'order=' + order + '&' : ''
        }${search ? 'search=' + search + '&' : ''}`
        const orderUrl = `${tag ? 'tag=' + tag + '&' : ''}${
            category ? 'category=' + category + '&' : ''
        }${search ? 'search=' + search + '&' : ''}`
        const pageUrl = `${tag ? 'tag=' + tag + '&' : ''}${
            order ? 'order=' + order + '&' : ''
        }${category ? 'category=' + category + '&' : ''}${
            search ? 'search=' + search + '&' : ''
        }`

        let match = { status: 'published' } // Hanya ambil postingan yang published
        if (category && tag) {
            match = {
                ...match,
                category: category,
                tags: tag
            }
        } else if (category) {
            match = {
                ...match,
                category: category
            }
        } else if (tag) {
            match = {
                ...match,
                tags: tag
            }
        }

        let searchPosts = null
        let countPosts = 0
        if (search) {
            const searchNoSpecialChar = search.replace(/[^a-zA-Z0-9 ]/g, '')

            countPosts = await Post.find(
                {
                    $or: [
                        {
                            title: {
                                $regex: new RegExp(searchNoSpecialChar, 'i')
                            }
                        },
                        {
                            category: {
                                $regex: new RegExp(searchNoSpecialChar, 'i')
                            }
                        },
                        {
                            tags: {
                                $regex: new RegExp(searchNoSpecialChar, 'i')
                            }
                        },
                        {
                            excerpt: {
                                $regex: new RegExp(searchNoSpecialChar, 'i')
                            }
                        }
                    ],
                    ...match
                },
                ['_id']
            ).then((data) => data.length)

            searchPosts = await Post.find(
                {
                    $or: [
                        {
                            title: {
                                $regex: new RegExp(searchNoSpecialChar, 'i')
                            }
                        },
                        {
                            category: {
                                $regex: new RegExp(searchNoSpecialChar, 'i')
                            }
                        },
                        {
                            tags: {
                                $regex: new RegExp(searchNoSpecialChar, 'i')
                            }
                        },
                        {
                            excerpt: {
                                $regex: new RegExp(searchNoSpecialChar, 'i')
                            }
                        }
                    ],
                    ...match
                },
                [
                    'title',
                    'slug',
                    'excerpt',
                    'body',
                    'thumbnail',
                    'category',
                    'tags',
                    'createdAt'
                ],
                {
                    skip: perPage * page - perPage, // Starting Row
                    limit: perPage, // Ending Row
                    sort: {
                        createdAt: order === 'asc' ? 1 : -1 //Sort by Date Added DESC
                    }
                }
            ).exec()
        } else {
            countPosts = await Post.aggregate([{ $match: match }])
                .then((data) => data.length)
        }

        const posts =
            searchPosts ||
            (await Post.aggregate([
                {
                    $sort: { createdAt: order === 'asc' ? 1 : -1 }
                },
                {
                    $match: match
                }
            ])
                .skip(perPage * page - perPage)
                .limit(perPage)
                .exec())

        const count = countPosts
        const prevPage = parseInt(page) - 1
        const hasPrevPage = !(page <= 1)
        const nextPage = parseInt(page) + 1
        const hasNextPage = nextPage <= Math.ceil(count / perPage)

        const postCategories = await Post.find({ status: 'published' }).then(
            (data) =>
                data
                    .filter(
                        (x, i, self) => x.category && x.category !== undefined
                    )
                    .map((x) => x.category)
                    .filter((x, i, self) => self.indexOf(x) === i)
        )

        const locale = {
            title: 'Lostpeople',
            description: 'Lostpeople adalah blog inspiratif yang menyajikan cerita, tips, dan informasi seputar kehidupan serta teknologi.',
            keywords: "lostpeople, blog, inspirasi, teknologi, devchamploo, gper, umam alfarizi, lost, people, dev",
            author: 'devChampl000',
            image: null,
            icon: '/assets/favicon.svg',
            name: 'Lostpeople',
            url: 'https://lostpeople.vercel.app'
        }

        res.render('posts', {
            layout,
            posts,
            postCategories,
            capitalizeEachWord,
            categoryUrl,
            orderUrl,
            pageUrl,
            current: page,
            count,
            prevPage: hasPrevPage ? prevPage : null,
            nextPage: hasNextPage ? nextPage : null,
            order,
            category,
            tag,
            search,
            locale,
            pageActive: 'blog'
        })
    } catch (err) {
        console.error(err)
    }
}


const postDetailPage = async (req, res, next) => {
    try {
        const post = await Post.findOneAndUpdate(
            { slug: req.params.slug, status: 'published' },
            { $inc: { viewsCount: 1 } }, // Tambahkan viewsCount sebanyak 1
            { new: true } // Kembalikan data terbaru setelah update
        )
            .populate('userId')
            .exec()

        if (!post) {
            return next()
        }

        post.content = marked.parse(post.content)

        const locale = {
            title: `${post.title} | Lostpeople`,
            description: post.excerpt,
            keywords: `${post.tags.join(', ')}, lostpeople, blog, devchamploo, gper, blog, umam alfarizi, lost, people, dev`,
            author: post.userId.name || 'Umam Alfarizi',
            image: `${post.thumbnail}`,
            icon: '/assets/favicon.svg',
            name: 'Lostpeople',
            url: `https://lostpeople.vercel.app/${post.slug}`
        }

        res.render('post-detail', {
            layout,
            post,
            capitalizeEachWord,
            locale,
            pageActive: 'post-detail'
        })
    } catch (err) {
        console.error(err)
        next(err)
    }
}

module.exports = { homePage, aboutPage, postsPage, postDetailPage }
