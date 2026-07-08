from rest_framework import serializers
from .models import MenuItem, Transaction, TransactionItem


class MenuItemSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.StringRelatedField(source='inventory_item', read_only=True)

    class Meta:
        model = MenuItem
        fields = '__all__'
        read_only_fields = ('business',)


class TransactionItemSerializer(serializers.ModelSerializer):
    menu_item_name     = serializers.CharField(source='menu_item.name',     read_only=True)
    menu_item_category = serializers.CharField(source='menu_item.category', read_only=True)

    class Meta:
        model = TransactionItem
        fields = ('id', 'menu_item', 'menu_item_name', 'menu_item_category', 'quantity', 'unit_price', 'subtotal')
        read_only_fields = ('subtotal',)


class TransactionSerializer(serializers.ModelSerializer):
    items           = TransactionItemSerializer(many=True)
    created_by_name = serializers.StringRelatedField(source='created_by', read_only=True)

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ('total', 'business', 'created_by')

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        transaction = Transaction.objects.create(**validated_data)
        self._save_items(transaction, items_data)
        return transaction

    def _save_items(self, transaction, items_data):
        from inventory.models import InventoryItem, InventoryRecord
        from sales.models import SalesRecord
        from django.db.models import Sum
        from decimal import Decimal

        total = Decimal('0')

        for item_data in items_data:
            menu_item = item_data['menu_item']
            qty       = item_data['quantity']
            price     = menu_item.price
            subtotal  = price * qty
            total    += subtotal

            TransactionItem.objects.create(
                transaction=transaction,
                menu_item=menu_item,
                quantity=qty,
                unit_price=price,
                subtotal=subtotal,
            )

            # Decrement inventory — create today's record if it doesn't exist yet
            if menu_item.inventory_item:
                inv_item = menu_item.inventory_item
                consumed = menu_item.inventory_qty_per_sale * qty

                record, created = InventoryRecord.objects.get_or_create(
                    business=transaction.business,
                    item=inv_item,
                    date=transaction.date,
                    defaults={
                        'opening_quantity': 0,
                        'quantity_received': 0,
                        'quantity_used': consumed,
                        'wastage': 0,
                        'notes': 'Auto-created by POS',
                        'created_by': transaction.created_by,
                    }
                )
                if not created:
                    record.quantity_used = Decimal(str(record.quantity_used)) + Decimal(str(consumed))
                    record.save()

        transaction.total = total
        transaction.save(update_fields=['total'])

        # Upsert today's SalesRecord from all completed transactions
        sales_record, _ = SalesRecord.objects.get_or_create(
            business=transaction.business,
            date=transaction.date,
            defaults={'total_sales': 0, 'created_by': transaction.created_by},
        )

        completed = Transaction.objects.filter(
            business=transaction.business,
            date=transaction.date,
            status=Transaction.Status.COMPLETED,
        ).prefetch_related('items__menu_item')

        day_total = Decimal('0')
        day_food  = Decimal('0')
        day_bev   = Decimal('0')
        txn_count = 0

        for t in completed:
            txn_count += 1
            for ti in t.items.all():
                day_total += ti.subtotal
                if ti.menu_item.category == 'food':
                    day_food += ti.subtotal
                elif ti.menu_item.category == 'beverage':
                    day_bev += ti.subtotal

        sales_record.total_sales      = day_total
        sales_record.food_sales       = day_food
        sales_record.beverage_sales   = day_bev
        sales_record.num_transactions = txn_count
        sales_record.save()
