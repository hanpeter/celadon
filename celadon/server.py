# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import BadRequest, HTTPException
from celadon.db import Database
from celadon.application import Application
from celadon.models import Purchaser, Purchase, Item


server = Flask(__name__)
CORS(app=server, origins="*", allow_headers=['content-type'])

database = Database()
app = Application(database)


@server.errorhandler(HTTPException)
def handle_http_exception(e):
    return jsonify({'error': str(e.description)}), e.code


def get_request_json():
    body = request.get_json(force=True, silent=True)
    if body is None:
        raise BadRequest('Request body must be valid JSON')
    return body


@server.route('/')
def hello():
    name = request.args.get('name', '')
    return "Hello {}".format(name).strip().title() + '!'


@server.route('/purchaser', methods=['GET', 'POST'])
@server.route('/purchaser/<int:purchaser_id>', methods=['GET', 'PUT'])
def purchaser(purchaser_id=None):
    if purchaser_id is None:
        if request.method == 'POST':
            return jsonify(app.add_purchaser(Purchaser.from_dict(get_request_json()))), 201
        elif request.method == 'GET':
            return jsonify(app.get_purchasers())
    else:
        if request.method == 'PUT':
            p = Purchaser.from_dict(get_request_json())
            p.id = purchaser_id
            return jsonify(app.update_purchaser(p))
        elif request.method == 'GET':
            return jsonify(app.get_purchaser(purchaser_id))


@server.route('/purchase', methods=['GET', 'POST'])
@server.route('/purchase/<int:purchase_id>', methods=['GET', 'PUT'])
def purchase(purchase_id=None):
    if purchase_id is None:
        if request.method == 'POST':
            return jsonify(app.add_purchase(Purchase.from_dict(get_request_json()))), 201
        elif request.method == 'GET':
            return jsonify(app.get_purchases())
    else:
        if request.method == 'PUT':
            p = Purchase.from_dict(get_request_json())
            p.id = purchase_id
            return jsonify(app.update_purchase(p))
        elif request.method == 'GET':
            return jsonify(app.get_purchase(purchase_id))


@server.route('/item', methods=['GET'])
@server.route('/item/<int:item_id>', methods=['GET', 'PUT'])
def item(item_id=None):
    if item_id is None:
        return jsonify(app.get_items())
    else:
        if request.method == 'PUT':
            i = Item.from_dict(get_request_json())
            i.id = item_id
            return jsonify(app.update_item(i))
        elif request.method == 'GET':
            return jsonify(app.get_item(item_id))
