const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

// Load input validation
const validatePostInput = require('../../validation/post');

// Load model
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Post = require('../../models/Post');

// @route GET api/posts
// @description Get post
// @access Public
router.get('/', (req, res) => {
    Post
        .find()
        .sort({ date: -1 })
        .then(posts => res.json(posts))
        .catch(error => res.status(404).json({ nopostsfound: 'No posts' }));
});

// @route GET api/posts/:id
// @description Get post by id
// @access Public
router.get('/:id', (req, res) => {
    Post
        .findById(req.params.id)
        .then(post => res.json(post))
        .catch(error => res.status(404).json({ nopostfound: 'No post found with that ID' }));
});

// @route POST api/posts
// @description Create post
// @access Private
router.post('/', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    
    // Check validation
    if(!isValid) {
        // Return any errors with 400 status
        return res.status(400).json(errors);
    }

    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id
    });

    newPost.save().then(post => res.json(post));
});

// @route POST api/posts/like/:id
// @description Like post - :id mean post id
// @access Private
router.post('/like/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile
        .findOne({ user: req.user.id })
        .then(profile => {
            Post
                .findById(req.params.id)
                .then(post => {
                    // Check if user already like post
                    if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
                        return res.status(400).json({ alreadyliked: 'User already liked this post' });
                    }

                    // Add user id to likes array
                    post.likes.unshift({ user: req.user.id });

                    post.save().then(post => res.json(post));
                })
                .catch(error => res.status(404).json({ postnotfound: 'No post found' }));
        });
});

// @route POST api/posts/unlike/:id
// @description Unlike post - :id mean post id
// @access Private
router.post('/unlike/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile
        .findOne({ user: req.user.id })
        .then(profile => {
            Post
                .findById(req.params.id)
                .then(post => {
                    // Check if user already like post
                    if(post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
                        return res.status(400).json({ notliked: 'You have not yet liked this post' });
                    }

                    // Get remove index
                    const removeIndex = post.likes
                        .map(item => item.user.toString())
                        .indexOf(req.user.id);
                    
                    // Splice out of array
                    post.likes.splice(removeIndex, 1);

                    // Save
                    post.save().then(post => res.json(post));
                })
                .catch(error => res.status(404).json({ postnotfound: 'No post found' }));
        });
});

// @route POST api/posts/comment/:id
// @description Add comment to post - :id mean post id
// @access Private
router.post('/comment/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    
    // Check validation
    if(!isValid) {
        // Return any errors with 400 status
        return res.status(400).json(errors);
    }

    Post
        .findById(req.params.id)
        .then(post => {
            const newComment = {
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id
            }

            // Add to comments array
            post.comments.unshift(newComment);

            // Save 
            post.save().then(post => res.json(post));
        })
        .catch(error => res.status(404).json({ postnotfound: 'No post found' }));
});

// @route DELETE api/posts/:id
// @description Delete post - :id mean post id
// @access Private
router.delete('/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile
        .findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // Check for post owner
                    if(post.user.toString() !== req.user.id) {
                        return res.status(401).json({ notauthorized: 'User not authorized' });
                    }

                    // Delete
                    post.remove().then(() => res.json({ success: true }));
                })
                .catch(error => res.status(404).json({ postnotfound: 'No post found' }));
        })
});

// @route DELETE api/posts/comment/:id/:comment_id
// @description Remove comment from post - :id mean post id :comment_id mean comment
// @access Private
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Post
        .findById(req.params.id)
        .then(post => {
            // Check to see if comment exists
            if(post.comments.filter(comment => comment._id.toString() === req.params.comment_id).length === 0) {
                return res.status(404).json({ commentnotexists: 'Comment does not exists' });
            }

            // Get remove index
            const removeIndex = post.comments 
                .map(item => item._id.toString())
                .indexOf(req.params.comment_id);
            
            // Splice comment out of array
            post.comments.splice(removeIndex, 1);

            post.save().then(post => res.json(post));
        })
        .catch(error => res.status(404).json({ postnotfound: 'No post found' }));
});

module.exports = router;