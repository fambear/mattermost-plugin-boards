// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const path = require('path');

const webpack = require('webpack');
const tsTransformer = require('@formatjs/ts-transformer');

const PLUGIN_ID = require('../plugin.json').id;

const NPM_TARGET = process.env.npm_lifecycle_event;

let mode = 'production';
let devtool;
const plugins = [];
if (NPM_TARGET === 'debug' || NPM_TARGET === 'debug:watch') {
    mode = 'development';
    devtool = 'source-map';
    plugins.push(
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('development'),
        }),
    );
}

const config = {
    entry: './src/index.tsx',
    resolve: {
        modules: [
            'src',
            'node_modules',
            path.resolve(__dirname),
        ],
        extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        getCustomTransformers: {
                            before: [
                                tsTransformer.transform({
                                    overrideIdFn: '[sha512:contenthash:base64:6]',
                                    ast: true,
                                }),
                            ],
                        },
                    },
                },
                exclude: [/node_modules/],
            },
            {
                test: /\.css$/i,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            },
            {
                test: /\.(png|eot|tiff|svg|ttf|jpg|gif|woff2|woff)$/,
                type: 'asset/resource',
            },
        ],
    },
    devtool,
    mode,
    plugins,
};

config.externals = {
    react: 'React',
    'react-dom': 'ReactDOM',
    redux: 'Redux',
    'react-redux': 'ReactRedux',
    'react-intl': 'ReactIntl',
    'mm-react-router-dom': 'ReactRouterDom',
    'prop-types': 'PropTypes',
};

config.output = {
    devtoolNamespace: PLUGIN_ID,
    path: path.join(__dirname, '/dist'),
    publicPath: '/',
    filename: 'main.js',
};

module.exports = config;
