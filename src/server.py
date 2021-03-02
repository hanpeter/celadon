from flask import Flask, request, jsonify
from src.db import Database
from src.app import Application
from src.models import Purchaser, Purchase, Item


server = Flask(__name__)
database = Database()
app = Application(database)


@server.route('/')
def hello():
    name = request.args.get('name', '')
    return "Hello {}".format(name).strip().title() + '!'


@server.route('/purchaser', methods=['GET', 'POST'])
@server.route('/purchaser/<int:id>', methods=['GET', 'PUT'])
def purchaser(id=None):
    if id is None:
        if request.method == 'POST':
            return jsonify(app.add_purchaser(Purchaser.from_dict(request.get_json()))), 201
        elif request.method == 'GET':
            return jsonify(app.get_purchasers())
    else:
        if request.method == 'PUT':
            purchaser = Purchaser.from_dict(request.get_json())
            purchaser.id = id
            return jsonify(app.update_purchaser(purchaser))
        elif request.method == 'GET':
            return jsonify(app.get_purchaser(id))


@server.route('/purchase', methods=['GET', 'POST'])
@server.route('/purchase/<int:id>', methods=['GET', 'PUT'])
def purchase(id=None):
    if id is None:
        if request.method == 'POST':
            return jsonify(app.add_purchase(Purchase.from_dict(request.get_json()))), 201
        elif request.method == 'GET':
            return jsonify(app.get_purchases())
    else:
        if request.method == 'PUT':
            purchase = Purchase.from_dict(request.get_json())
            purchase.id = id
            return jsonify(app.update_purchase(purchase))
        elif request.method == 'GET':
            return jsonify(app.get_purchase(id))

@server.route('/item', methods=['GET'])
@server.route('/item/<int:id>', methods=['GET', 'PUT'])
def item(id=None):
    if id is None:
        return jsonify(app.get_items())
    else:
        if request.method == 'PUT':
            item = Item.from_dict(request.get_json())
            item.id = id
            return jsonify(app.update_item(item))
        elif request.method == 'GET':
            return jsonify(app.get_item(id))
